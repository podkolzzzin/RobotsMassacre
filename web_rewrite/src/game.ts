import { Assets, writeFont } from './assets';
import { SoundBank } from './audio';
import { InputState } from './input';
import { LevelData, PlayerState, BulletState, Direction, HitState, NetworkGameState, ParticleState, StaticEntity, TILE_SIZE, WallState, BonusState, BonusKind, InventoryKind, InventoryItemState, Team } from './types';
import { nextArbitraryFrame, spriteForDetail, spriteForEntity, spriteForTile, wallFrame } from './level';

const PLAYER_W = 26;
const PLAYER_H = 27;
const MAX_SPEED = 4.5;
const SPEED_DELTA = 0.2;
const MIN_SPEED = 0.1;
const SHOT_DELAY = 400;
const BULLET_SPEED = 8;
const BULLET_DAMAGE = 20;
const BULLET_SIZE = 4;
const WATER_SKIP_REDRAW_TICKS = 3;
const HIT_BROADCAST_TICKS = 20;
const BONUS_SKIP_TICKS = 225;
const BONUS_LIFETIME = 2500;
const MAX_BONUSES = 16;
const MAX_AMMO = 125;
const BONUS_REMOVE_BROADCAST_TICKS = 20;
const AP_BULLETS_DURATION = 7500;
const ACCELERATION_DURATION = 8000;
const INVULNERABILITY_DURATION = 5000;
const DISPENSER_RANGE = 225;
const DISPENSER_ENERGY = 1125;
const DISPENSER_SKIP_RENEW_TICKS = 1;
const TURRET_SIZE = 24;
const TURRET_RANGE = 300;
const TURRET_SHOT_DELAY = 450;
const MINE_SIZE = 22;
const MINE_RANGE = 50;
const MINE_EXPLOSION_DELAY = 25;
const MINE_MAX_DAMAGE = 100;
const MINE_DAMAGE_DELTA = 5;
const BONUS_KINDS: BonusKind[] = ['acceleration', 'ap-bullets', 'big-ammo', 'big-med', 'invulnerability', 'mine', 'small-ammo', 'small-med', 'turret', 'dispenser'];

export class Game {
  readonly players = new Map<string, PlayerState>();
  readonly bullets = new Map<string, BulletState>();
  readonly bonuses = new Map<string, BonusState>();
  readonly particles: ParticleState[] = [];
  readonly score = { red: 0, blu: 0 };
  readonly localStats = { shots: 0, hits: 0 };
  statsPinned = false;
  localId: string;
  private speed = MIN_SPEED;
  private lastShot = 0;
  private cameraX = 0;
  private cameraY = 0;
  private trackState = 2;
  private skippedTrackTicks = 0;
  private skippedBonusTicks = 0;
  private bonusId = 0;
  private entityId = 0;
  private readonly consumedRemoteBullets = new Set<string>();
  private readonly consumedBonuses = new Set<string>();
  private readonly recentHits: Array<HitState & { ticks: number }> = [];
  private readonly recentBonusRemovals: Array<{ id: string; ticks: number }> = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D,
    private readonly level: LevelData,
    private readonly assets: Assets,
    private readonly input: InputState,
    private readonly sounds = new SoundBank(),
    private readonly mode = 'dm',
  ) {
    this.localId = crypto.randomUUID();
    const spawn = level.spawners[0] ?? { x: TILE_SIZE, y: TILE_SIZE };
    this.players.set(this.localId, {
      id: this.localId,
      x: spawn.x,
      y: spawn.y,
      hp: 100,
      ammo: 75,
      direction: Direction.Down,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Tanker',
      pickedBonuses: [],
      inventory: [inventoryItem('cannon')],
      currentInventoryKey: 1,
      team: 'none',
    });
  }

  get localPlayer(): PlayerState {
    const player = this.players.get(this.localId);
    if (!player) throw new Error('Local player is missing');
    return player;
  }

  tick(now: number): void {
    const player = this.localPlayer;
    this.updateWaterTiles();
    this.updateRecentHits();
    this.updateRecentBonusRemovals();
    this.updateBonuses();
    this.manageBonusGeneration();
    this.updatePickedBonuses(player, now);
    this.pickUpBonuses(player, now);
    this.updateBuildings();
    this.updateInventorySelection(player);
    this.updateCarriedBuilding(player);
    const moveInput = this.getMoveInput();
    player.moving = moveInput.moving;

    if (moveInput.moving) {
      this.movePlayer(player, moveInput);
      const maxSpeed = this.maxSpeed(player, now);
      if (this.speed < maxSpeed) this.speed = Math.min(maxSpeed, this.speed + SPEED_DELTA);
      if (this.skippedTrackTicks++ > 2) {
        this.skippedTrackTicks = 0;
        if (this.trackState++ >= 2) this.trackState = 0;
      }
    } else {
      this.speed = MIN_SPEED;
      this.trackState = 0;
    }

    this.updateFlags(player);
    this.updateBuildingInteraction(player);
    if (this.input.consumeSelfDamage()) this.damageSelf(player, 10);

    player.shooting = false;
    if (this.input.consumeAttack()) {
      const selectedItem = player.inventory.find((item) => item.activationKey === player.currentInventoryKey);
      if (player.holdingFlag) {
        player.shooting = false;
      } else if (selectedItem && selectedItem.kind !== 'cannon') {
        if (this.useInventoryItem(player, selectedItem)) this.input.suppressAttackUntilRelease();
      } else if (player.ammo > 0 && now - this.lastShot >= SHOT_DELAY) {
        this.lastShot = now;
        player.shooting = true;
        this.localStats.shots += 1;
        player.ammo -= 1;
        const [bx, by] = bulletOrigin(player);
        const id = `${player.id}:${now}`;
        this.bullets.set(id, { id, owner: player.id, x: bx, y: by, direction: player.direction, ap: this.hasActiveBonus(player, 'ap-bullets', now) });
        this.addBarrelFlame(player, id);
        this.sounds.play('shoot');
      }
    }

    this.updateParticles();

    for (const bullet of this.bullets.values()) {
      moveBullet(bullet);
      const hitEntity = this.level.entities.find((entity) => {
        const [w, h] = entitySize(entity);
        return !entity.removed && entity.solid && rectsIntersect(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE, entity.x, entity.y, w, h);
      });
      if (hitEntity) {
        this.playEntityHitSound(hitEntity);
        this.addEntityHitParticle(bullet, hitEntity);
        this.damageEntity(hitEntity, bullet.ap ? BULLET_DAMAGE * 3 : BULLET_DAMAGE);
        this.consumeBullet(bullet);
        this.bullets.delete(bullet.id);
        continue;
      }
      if (this.outsideWorld(bullet.x, bullet.y)) {
        this.consumeBullet(bullet);
        this.bullets.delete(bullet.id);
        continue;
      }

      const hitPlayer = [...this.players.values()].find((target) => this.isEnemy(bullet.owner, target.id) && rectsIntersect(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE, target.x, target.y, PLAYER_W, PLAYER_H));
      if (hitPlayer) {
        this.damagePlayer(hitPlayer, bullet.owner, bullet.ap ? BULLET_DAMAGE * 3 : BULLET_DAMAGE, bullet.id);
        if (bullet.owner === this.localId) this.localStats.hits += 1;
        this.consumeBullet(bullet);
        this.bullets.delete(bullet.id);
      }
    }

    for (const bullet of this.bullets.values()) {
      const hitBullet = [...this.bullets.values()].find((other) => other.id !== bullet.id && other.owner !== bullet.owner && rectsIntersect(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE, other.x, other.y, BULLET_SIZE, BULLET_SIZE));
      if (hitBullet) {
        this.consumeBullet(bullet);
        this.consumeBullet(hitBullet);
        this.bullets.delete(bullet.id);
        this.bullets.delete(hitBullet.id);
      }
    }

    this.centerCamera(player);
  }

  upsertRemotePlayer(state: PlayerState): void {
    if (state.id !== this.localId) this.players.set(state.id, normalizePlayerState(state));
  }

  snapshot(): PlayerState {
    return { ...this.localPlayer };
  }

  networkState(): NetworkGameState {
    return {
      player: this.snapshot(),
      bullets: [...this.bullets.values()].filter((bullet) => bullet.owner === this.localId).map((bullet) => ({ ...bullet })),
      bonuses: [...this.bonuses.values()].filter((bonus) => bonus.owner === this.localId).map((bonus) => ({ ...bonus })),
      buildings: this.ownedBuildings(this.localId),
      flags: this.flags().map((flag) => ({ ...flag })),
      score: { ...this.score },
      removedBonuses: this.recentBonusRemovals.map((bonus) => bonus.id),
      walls: this.changedWalls(),
      hits: this.recentHits.map(({ ticks: _ticks, ...hit }) => ({ ...hit })),
    };
  }

  applyNetworkState(state: NetworkGameState): void {
    this.upsertRemotePlayer(state.player);
    this.replaceRemoteBullets(state.player.id, state.bullets);
    this.replaceRemoteBonuses(state.player.id, state.bonuses);
    this.replaceRemoteBuildings(state.player.id, state.buildings ?? []);
    this.applyFlagStates(state.flags ?? []);
    this.applyScore(state.score);
    this.applyBonusRemovals(state.removedBonuses);
    this.applyWallStates(state.walls);
    this.applyHits(state.hits);
  }

  levelSummary(): { tiles: number; details: number; entities: number; spawners: number } {
    return {
      tiles: this.level.tiles.length,
      details: this.level.details.length,
      entities: this.level.entities.filter((entity) => !entity.removed).length,
      spawners: this.level.spawners.length,
    };
  }

  entityAtCell(x: number, y: number): { kind: string; health: number; solid: boolean; removed: boolean } | undefined {
    const entity = this.level.entities.find((candidate) => candidate.x === x * TILE_SIZE && candidate.y === y * TILE_SIZE);
    return entity ? { kind: entity.kind, health: entity.health, solid: entity.solid, removed: entity.removed } : undefined;
  }

  tileAtCell(x: number, y: number): { kind: string; frame: number } | undefined {
    const tile = this.level.tiles.find((candidate) => candidate.x === x * TILE_SIZE && candidate.y === y * TILE_SIZE);
    return tile ? { kind: tile.kind, frame: tile.frame } : undefined;
  }

  visualState(): { trackState: number; speed: number } {
    return { trackState: this.trackState, speed: this.speed };
  }

  soundEvents(): string[] {
    return [...this.sounds.events];
  }

  addBonus(kind: BonusKind, x: number, y: number): BonusState {
    const bonus = { id: `${this.localId}:${++this.bonusId}`, owner: this.localId, kind, x, y, living: 0, lifeTime: BONUS_LIFETIME };
    this.bonuses.set(bonus.id, bonus);
    return bonus;
  }

  render(): void {
    const { ctx } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(-Math.round(this.cameraX), -Math.round(this.cameraY));

    for (const tile of this.level.tiles) {
      if (tile.kind === 'empty') continue;
      const [sx, sy] = spriteForTile(tile.kind);
      this.assets.graphics.draw(ctx, sx + tile.frame, sy, tile.x, tile.y);
    }
    for (const detail of this.level.details) {
      const [sx, sy] = spriteForDetail(detail);
      this.assets.graphics.draw(ctx, sx, sy, detail.x, detail.y, detail.direction * Math.PI / 2);
    }
    if (this.showBuildingGrid()) this.renderBuildingGrid();
    for (const entity of this.level.entities) {
      if (entity.removed) continue;
      this.renderEntity(entity);
    }
    for (const spawner of this.level.spawners) {
      const [sx, sy] = spriteForEntity(spawner.kind);
      this.assets.graphics.draw(ctx, sx, sy, spawner.x, spawner.y);
    }
    for (const bonus of this.bonuses.values()) this.renderBonus(bonus);
    for (const bullet of this.bullets.values()) {
      this.assets.graphics.draw(ctx, bullet.direction, bullet.ap ? 0 : 1, bullet.x, bullet.y);
    }
    for (const particle of this.particles) this.renderParticle(particle);
    for (const player of this.players.values()) this.renderPlayer(player);

    ctx.restore();
    this.renderHud();
    if (this.input.down.has('Tab') || this.statsPinned) this.renderStatistics();
  }

  private renderPlayer(player: PlayerState): void {
    const x = player.x - 2;
    const y = player.y - 2;
    const rotation = player.direction * Math.PI / 2;
    const selectedItem = player.inventory.find((item) => item.activationKey === player.currentInventoryKey);
    const carriedBuilding = player.carriedBuildingId ? this.level.entities.find((entity) => entity.id === player.carriedBuildingId) : undefined;
    const bodyRow = player.holdingFlag || carriedBuilding || (selectedItem?.kind !== undefined && selectedItem.kind !== 'cannon') ? 12 : 9;
    this.assets.graphics.draw(this.ctx, 0, bodyRow + this.trackState, x, y, rotation);
    this.assets.graphics.drawHue(this.ctx, 1, 9, x + gunOffsetX(player.direction), y + gunOffsetY(player.direction), unitHue(player.id), rotation);
    if (player.holdingFlag) this.renderHeldFlag(player);
    else if (carriedBuilding) this.renderCarriedBuildingPreview(player, carriedBuilding);
    else if (selectedItem && selectedItem.kind !== 'cannon') this.renderInventoryPreview(player, selectedItem);
    if (player.id !== this.localId) this.renderHealthBar(player, x, y);
  }

  private showBuildingGrid(): boolean {
    const selectedItem = this.localPlayer.inventory.find((item) => item.activationKey === this.localPlayer.currentInventoryKey);
    return selectedItem !== undefined && selectedItem.kind !== 'cannon';
  }

  private renderBuildingGrid(): void {
    const width = this.level.width * TILE_SIZE;
    const height = this.level.height * TILE_SIZE;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.29)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = -width; x < width; x += TILE_SIZE / 3) {
      this.ctx.moveTo(Math.round(x) + 0.5, 0);
      this.ctx.lineTo(Math.round(x) + 0.5, height);
    }
    for (let y = -height; y < height; y += TILE_SIZE / 3) {
      this.ctx.moveTo(0, Math.round(y) + 0.5);
      this.ctx.lineTo(width, Math.round(y) + 0.5);
    }
    this.ctx.stroke();
  }

  private renderHeldFlag(player: PlayerState): void {
    const [ox, oy] = inventoryRenderOffset(player.direction);
    this.assets.graphics.drawHue(this.ctx, 7, 5, player.x + ox, player.y + oy, unitHue(player.id), player.direction * Math.PI / 2);
  }

  private renderInventoryPreview(player: PlayerState, item: InventoryItemState): void {
    const [sx, sy] = inventoryFieldSprite(item.kind);
    const [ox, oy] = inventoryRenderOffset(player.direction);
    this.assets.graphics.drawHue(this.ctx, sx, sy, player.x + ox, player.y + oy, unitHue(player.id), player.direction * Math.PI / 2);
    const [hx, hy] = newEntityOffset(player);
    this.assets.graphics.draw(this.ctx, inventoryHologramIndex(item.kind), 17, player.x + hx, player.y + hy);
  }

  private renderCarriedBuildingPreview(player: PlayerState, entity: StaticEntity): void {
    const kind = inventoryKindForEntity(entity);
    if (!kind) return;
    const [sx, sy] = inventoryFieldSprite(kind);
    const [ox, oy] = inventoryRenderOffset(player.direction);
    this.assets.graphics.drawHue(this.ctx, sx, sy, player.x + ox, player.y + oy, unitHue(player.id), player.direction * Math.PI / 2);
    const [hx, hy] = newEntityOffset(player);
    this.assets.graphics.draw(this.ctx, inventoryHologramIndex(kind), 17, player.x + hx, player.y + hy);
  }

  private renderHealthBar(player: PlayerState, x: number, y: number): void {
    if (player.hp <= 0) return;
    let color = 'rgb(0, 128, 0)';
    if (player.hp < 100 / 3) color = 'rgb(255, 0, 0)';
    else if (player.hp < 100 * 2 / 3) color = 'rgb(255, 255, 0)';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x + 3), Math.round(y + PLAYER_H), Math.round(player.hp / 100 * PLAYER_W), 4);
  }

  private renderEntity(entity: StaticEntity): void {
    const focused = this.isFocusedBuilding(entity);
    if (focused) this.renderBuildingFocus(entity);
    if (entity.kind === 'wall') {
      this.assets.graphics.draw(this.ctx, wallFrame(entity.health, entity.maxHealth), 2, entity.x, entity.y);
      return;
    }
    if (entity.kind === 'turret') {
      this.assets.graphics.drawHue(this.ctx, 0, 15, entity.x, entity.y, unitHue(entity.owner ?? ''), (entity.direction ?? Direction.Up) * Math.PI / 2);
      return;
    }
    if (entity.kind === 'mine') {
      this.assets.graphics.draw(this.ctx, 7, 1, entity.x, entity.y);
      if (entity.countdown) writeFont(this.ctx, this.assets, `${MINE_EXPLOSION_DELAY - (entity.skippedExplTicks ?? 0)}`, 1, entity.x, entity.y);
      return;
    }
    if (entity.kind === 'dispenser') {
      this.assets.graphics.draw(this.ctx, 9, 1, entity.x, entity.y);
      return;
    }
    const [sx, sy] = spriteForEntity(entity.kind);
    this.assets.graphics.draw(this.ctx, sx, sy, entity.x, entity.y);
  }

  private isFocusedBuilding(entity: StaticEntity): boolean {
    if (!isPlacedBuilding(entity) || entity.removed || entity.countdown || entity.owner !== this.localId) return false;
    const player = this.localPlayer;
    if (player.carriedBuildingId) return false;
    const range = interactionRange(player);
    const [w, h] = entitySize(entity);
    return rectsIntersect(range.x, range.y, range.w, range.h, entity.x, entity.y, w, h);
  }

  private renderBuildingFocus(entity: StaticEntity): void {
    const [w, h] = entitySize(entity);
    this.ctx.strokeStyle = 'rgb(255, 255, 255)';
    this.ctx.lineWidth = entity.kind === 'dispenser' ? 2 : 1;
    const rectX = entity.kind === 'dispenser' ? entity.x - 2 : entity.x;
    const rectY = entity.kind === 'dispenser' ? entity.y - 2 : entity.y;
    const rectSize = entity.kind === 'dispenser' ? 32 : 30;
    this.ctx.strokeRect(Math.round(rectX) + 0.5, Math.round(rectY) + 0.5, rectSize, rectSize);

    if (entity.kind === 'turret') this.fillRangeCircle(entity.x + w / 2, entity.y + h / 2, TURRET_RANGE);
    if (entity.kind === 'mine') this.fillRangeCircle(entity.x + w / 2, entity.y + h / 2, MINE_RANGE);
    if (entity.kind === 'dispenser') this.fillRangeCircle(entity.x + w / 2, entity.y + h / 2, DISPENSER_RANGE);
    if (entity.kind === 'turret' || entity.kind === 'dispenser') this.renderBuildingHealthBar(entity);
  }

  private fillRangeCircle(cx: number, cy: number, diameter: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.39)';
    this.ctx.beginPath();
    this.ctx.ellipse(Math.round(cx), Math.round(cy), diameter / 2, diameter / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderBuildingHealthBar(entity: StaticEntity): void {
    let color = 'rgb(0, 128, 0)';
    if (entity.health < entity.maxHealth / 3) color = 'rgb(255, 0, 0)';
    else if (entity.health < entity.maxHealth * 2 / 3) color = 'rgb(255, 255, 0)';
    this.ctx.fillStyle = color;
    const [, h] = entitySize(entity);
    this.ctx.fillRect(Math.round(entity.x), Math.round(entity.y + h + 6), Math.round(entity.health / entity.maxHealth * 30), 4);
  }

  private renderBonus(bonus: BonusState): void {
    this.assets.graphics.draw(this.ctx, bonusImageIndex(bonus.kind), 19, bonus.x, bonus.y);
  }

  private renderParticle(particle: ParticleState): void {
    if (particle.kind === 'barrel-flame') {
      const [ox, oy] = barrelFlameOffset(particle.direction);
      this.assets.graphics.draw(this.ctx, 4, 1, particle.x + ox, particle.y + oy, particle.direction * Math.PI / 2);
      return;
    }
    if (particle.kind === 'wall-debris') {
      this.assets.graphics.draw(this.ctx, 3, 2, particle.x, particle.y);
      if (particle.animationState <= particle.animationStates) this.assets.graphics.draw(this.ctx, 6 + particle.animationState, 2, particle.x, particle.y);
      return;
    }
    if (particle.kind === 'robot-debris') {
      this.assets.graphics.draw(this.ctx, 8 + particle.debrisFrame, 9, particle.x, particle.y, particle.direction * Math.PI / 2);
      if (particle.animationState <= particle.animationStates) this.assets.graphics.draw(this.ctx, particle.animationState, 8, particle.x, particle.y);
      return;
    }
    if (particle.kind === 'dispense-heal' || particle.kind === 'dispense-ammo') {
      if (particle.animationState <= particle.animationStates) {
        const sx = (particle.kind === 'dispense-heal' ? 11 : 14) + particle.animationState;
        this.assets.graphics.draw(this.ctx, sx, 1, particle.x, particle.y);
      }
      return;
    }
    if (particle.kind === 'mine-explosion') {
      this.assets.graphics.draw(this.ctx, 11 + particle.debrisFrame, 0, particle.x, particle.y);
      return;
    }
    if (particle.animationState > particle.animationStates) return;
    const renderDirection = oppositeDirection(particle.direction);
    const [sx, sy] = particle.kind === 'spark' ? [particle.animationState, 7] : [3 + particle.animationState, 7];
    const [ox, oy] = particle.kind === 'spark' ? sparkOffset(renderDirection) : brickDustOffset(renderDirection);
    this.assets.graphics.draw(this.ctx, sx, sy, particle.x + ox, particle.y + oy, renderDirection * Math.PI / 2);
  }

  private renderHud(): void {
    const player = this.localPlayer;
    const hudTop = this.canvas.height - 45;
    this.ctx.fillStyle = 'rgb(0, 0, 0)';
    this.ctx.fillRect(0, hudTop, this.canvas.width, 45);

    this.assets.graphics.draw(this.ctx, 1, 18, 10, this.canvas.height - 30);
    const health = `${player.hp}`;
    writeFont(this.ctx, this.assets, health, 1, 31, this.canvas.height - 26);

    const ammoX = 31 + health.length * 8 + 10;
    this.assets.graphics.draw(this.ctx, 0, 18, ammoX, this.canvas.height - 30);
    writeFont(this.ctx, this.assets, `${player.ammo}`, 1, ammoX + 21, this.canvas.height - 26);

    const bonusWidth = 24;
    const bonusPadding = 5;
    let bonusX = this.canvas.width - bonusWidth - 13;
    for (let i = player.pickedBonuses.length - 1; i >= 0; i -= 1) {
      const bonus = player.pickedBonuses[i];
      this.assets.graphics.draw(this.ctx, bonusImageIndex(bonus.kind), 19, bonusX - 3, this.canvas.height - 37);
      const elapsed = Math.max(0, performance.now() - bonus.activationTime);
      const barWidth = Math.max(0, Math.round((bonusWidth - 2) - elapsed / bonus.duration * (bonusWidth - 2)));
      this.ctx.fillStyle = 'rgb(0, 128, 0)';
      this.ctx.fillRect(Math.round(bonusX + 1), this.canvas.height - 14, barWidth, 4);
      bonusX -= bonusWidth + bonusPadding;
    }

    const itemWidth = 24;
    const itemPadding = 21;
    let inventoryX = this.canvas.width / 2 - ((itemWidth + itemPadding) * player.inventory.length) / 2;
    for (const item of player.inventory) {
      if (item.activationKey === player.currentInventoryKey) {
        this.ctx.fillStyle = 'rgba(113, 123, 140, 0.78)';
        this.ctx.fillRect(Math.round(inventoryX - 17), this.canvas.height - 44, 45, 44);
      }
      writeFont(this.ctx, this.assets, `${item.activationKey}`, 1, inventoryX - 12, this.canvas.height - 25);
      this.assets.graphics.draw(this.ctx, item.imageIndex, 19, inventoryX - 3, this.canvas.height - 37);
      if (item.amount > 1) {
        const amount = `${item.amount}`;
        writeFont(this.ctx, this.assets, amount, 1, inventoryX + itemWidth / 2 - amount.length * 4, this.canvas.height - 9);
      }
      inventoryX += itemWidth + itemPadding;
    }

    writeFont(this.ctx, this.assets, `red score ${this.score.red}, blu score ${this.score.blu}`, 1, 10, 20);
    writeFont(this.ctx, this.assets, `${this.localStats.shots}`, 1, 10, 30);
  }

  private renderStatistics(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.69)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const colWidth = 195;
    const nameColSx = this.canvas.width / 2 - colWidth / 2;
    const killsColSx = nameColSx + 100;
    const deathsColSx = killsColSx + 50;
    let y = 20;
    writeCentered(this.ctx, this.assets, 'statistics', 2, y, this.canvas.width);
    y += 40;

    const players = [...this.players.values()].sort((a, b) => a.kills - b.kills);
    if (this.mode === 'dm') {
      y = this.renderStatisticsColumns(y, players, nameColSx, killsColSx, deathsColSx);
      return;
    }

    let xOffset = -(this.canvas.width - colWidth) / 4 - 15;
    const startY = y;
    writeFont(this.ctx, this.assets, 'team of blu', 1, nameColSx + xOffset, y);
    y += 20;
    this.renderStatisticsColumns(y, players.filter((player) => player.team === 'blu'), nameColSx + xOffset, killsColSx + xOffset, deathsColSx + xOffset);

    xOffset = -xOffset;
    y = startY;
    writeFont(this.ctx, this.assets, 'team of red', 1, nameColSx + xOffset, y);
    y += 20;
    this.renderStatisticsColumns(y, players.filter((player) => player.team === 'red'), nameColSx + xOffset, killsColSx + xOffset, deathsColSx + xOffset);
  }

  private renderStatisticsColumns(y: number, players: PlayerState[], nameX: number, killsX: number, deathsX: number): number {
    writeFont(this.ctx, this.assets, 'name', 1, nameX, y);
    writeFont(this.ctx, this.assets, 'kills', 1, killsX, y);
    writeFont(this.ctx, this.assets, 'deaths', 1, deathsX, y);
    y += 20;
    for (const player of players) {
      writeFont(this.ctx, this.assets, player.name, 1, nameX, y);
      writeFont(this.ctx, this.assets, `${player.kills}`, 1, killsX, y);
      writeFont(this.ctx, this.assets, `${player.deaths}`, 1, deathsX, y);
      y += 10;
    }
    return y;
  }

  private getMoveInput(): { moving: boolean; x: number; y: number; facing?: Direction } {
    const vector = this.input.movementVector();
    const moving = vector.x !== 0 || vector.y !== 0;
    const facing = directionForCode(this.input.latestMovementCode()) ?? directionForVector(vector.x, vector.y);
    return { moving, x: vector.x, y: vector.y, facing };
  }

  private movePlayer(player: PlayerState, input: { x: number; y: number; facing?: Direction }): void {
    if (input.facing !== undefined) player.direction = input.facing;
    const length = Math.hypot(input.x, input.y) || 1;
    const dx = input.x / length * this.speed;
    const dy = input.y / length * this.speed;
    if (dx !== 0 && !this.blockedAt(player, player.x + dx, player.y)) player.x += dx;
    if (dy !== 0 && !this.blockedAt(player, player.x, player.y + dy)) player.y += dy;
  }

  private updateInventorySelection(player: PlayerState): void {
    const key = this.input.consumeInventoryKey();
    if (key !== undefined && player.inventory.some((item) => item.activationKey === key)) player.currentInventoryKey = key;
  }

  // Touch: tapping an inventory slot in the bottom HUD selects it; tapping the
  // score strip at the top toggles the statistics overlay.
  handleHudTap(x: number, y: number): boolean {
    if (y < 24) {
      this.statsPinned = !this.statsPinned;
      return true;
    }
    if (y < this.canvas.height - 44) return false;
    const player = this.localPlayer;
    const itemWidth = 24;
    const itemPadding = 21;
    let inventoryX = this.canvas.width / 2 - ((itemWidth + itemPadding) * player.inventory.length) / 2;
    for (const item of player.inventory) {
      if (x >= inventoryX - 17 && x < inventoryX + 28) {
        player.currentInventoryKey = item.activationKey;
        return true;
      }
      inventoryX += itemWidth + itemPadding;
    }
    return false;
  }

  private updateCarriedBuilding(player: PlayerState): void {
    if (!player.carriedBuildingId) return;
    const entity = this.level.entities.find((candidate) => candidate.id === player.carriedBuildingId);
    if (!entity || entity.removed || entity.owner !== player.id) {
      player.carriedBuildingId = undefined;
      return;
    }
    entity.x = player.x;
    entity.y = player.y;
    entity.solid = false;
  }

  private updateBuildingInteraction(player: PlayerState): void {
    if (!this.input.consumeInteract()) return;
    if (player.carriedBuildingId) {
      this.dropCarriedBuilding(player);
      return;
    }
    const entity = this.findGrabbableBuilding(player);
    if (!entity?.id) return;
    entity.x = player.x;
    entity.y = player.y;
    entity.solid = false;
    player.carriedBuildingId = entity.id;
  }

  private findGrabbableBuilding(player: PlayerState): StaticEntity | undefined {
    const range = interactionRange(player);
    return this.level.entities.find((candidate) => {
      const [w, h] = entitySize(candidate);
      return isPlacedBuilding(candidate)
        && candidate.owner === player.id
        && !candidate.removed
        && !candidate.countdown
        && rectsIntersect(range.x, range.y, range.w, range.h, candidate.x, candidate.y, w, h);
    });
  }

  // Touch UI: whether the grab button has anything to act on right now.
  canGrabBuilding(): boolean {
    const player = this.localPlayer;
    return player.carriedBuildingId !== undefined || this.findGrabbableBuilding(player) !== undefined;
  }

  private dropCarriedBuilding(player: PlayerState): void {
    const entity = this.level.entities.find((candidate) => candidate.id === player.carriedBuildingId);
    if (!entity) {
      player.carriedBuildingId = undefined;
      return;
    }
    const [ox, oy] = newEntityOffset(player);
    const oldX = entity.x;
    const oldY = entity.y;
    entity.x = player.x + ox;
    entity.y = player.y + oy;
    entity.solid = true;
    if (this.placementBlocked(entity, player)) {
      entity.x = oldX;
      entity.y = oldY;
      entity.solid = false;
      return;
    }
    player.carriedBuildingId = undefined;
  }

  private useInventoryItem(player: PlayerState, item: InventoryItemState): boolean {
    const [ox, oy] = newEntityOffset(player);
    const entity = placedEntity(item.kind, player.id, player.x + ox, player.y + oy, `${this.localId}:entity:${++this.entityId}`);
    if (!entity || this.placementBlocked(entity, player)) return false;
    this.level.entities.push(entity);
    this.consumeInventoryItem(player, item);
    return true;
  }

  private placementBlocked(entity: StaticEntity, player: PlayerState): boolean {
    const [w, h] = entitySize(entity);
    return entity.x < 0 || entity.y < 0 || entity.x + w > this.level.width * TILE_SIZE || entity.y + h > this.level.height * TILE_SIZE
      || this.level.entities.some((candidate) => {
        const [cw, ch] = entitySize(candidate);
        return candidate !== entity && !candidate.removed && rectsIntersect(entity.x, entity.y, w, h, candidate.x, candidate.y, cw, ch);
      })
      || [...this.players.values()].some((other) => other.id !== player.id && rectsIntersect(entity.x, entity.y, w, h, other.x, other.y, PLAYER_W, PLAYER_H));
  }

  private consumeInventoryItem(player: PlayerState, item: InventoryItemState): void {
    if (item.amount > 1) {
      item.amount -= 1;
      return;
    }
    player.inventory = player.inventory.filter((candidate) => candidate !== item);
    if (!player.inventory.some((candidate) => candidate.activationKey === player.currentInventoryKey)) {
      player.currentInventoryKey = previousInventoryKey(player.inventory, player.currentInventoryKey);
    }
  }

  private blockedAt(player: PlayerState, x: number, y: number): boolean {
    return this.solidAt(x, y, PLAYER_W, PLAYER_H)
      || [...this.players.values()].some((other) => other.id !== player.id && rectsIntersect(x, y, PLAYER_W, PLAYER_H, other.x, other.y, PLAYER_W, PLAYER_H));
  }

  private solidAt(x: number, y: number, w: number, h: number): boolean {
    if (x < 0 || y < 0 || x + w > this.level.width * TILE_SIZE || y + h > this.level.height * TILE_SIZE) return true;
    return this.level.entities.some((entity) => {
      const [ew, eh] = entitySize(entity);
      return !entity.removed && entity.solid && rectsIntersect(x, y, w, h, entity.x, entity.y, ew, eh);
    });
  }

  private outsideWorld(x: number, y: number): boolean {
    return x <= 0 || y <= 0 || x >= this.level.width * TILE_SIZE || y >= this.level.height * TILE_SIZE;
  }

  private damagePlayer(player: PlayerState, ownerId: string, damage: number, hitId?: string): void {
    if (!this.isEnemy(ownerId, player.id)) return;
    if (this.hasActiveBonus(player, 'invulnerability', performance.now())) return;
    player.hp = Math.max(0, player.hp - damage);
    if (hitId && ownerId === this.localId && player.id !== this.localId) {
      this.recentHits.push({ id: hitId, owner: ownerId, target: player.id, damage, ticks: HIT_BROADCAST_TICKS });
    }
    if (player.hp === 0) {
      this.addRobotDebris(player);
      this.stopHoldingFlag(player);
      player.deaths += 1;
      const owner = this.players.get(ownerId);
      if (owner) owner.kills += 1;
      const spawn = this.spawnForPlayer(player);
      player.x = spawn?.x ?? TILE_SIZE;
      player.y = spawn?.y ?? TILE_SIZE;
      player.hp = 100;
      player.ammo = 75;
      player.pickedBonuses = [];
      player.inventory = [inventoryItem('cannon')];
      player.currentInventoryKey = 1;
    }
  }

  private damageSelf(player: PlayerState, damage: number): void {
    if (this.hasActiveBonus(player, 'invulnerability', performance.now())) return;
    player.hp = Math.max(0, player.hp - damage);
    if (player.hp !== 0) return;
    this.addRobotDebris(player);
    this.stopHoldingFlag(player);
    player.deaths += 1;
    const spawn = this.spawnForPlayer(player);
    player.x = spawn?.x ?? TILE_SIZE;
    player.y = spawn?.y ?? TILE_SIZE;
    player.hp = 100;
    player.ammo = 75;
    player.pickedBonuses = [];
    player.inventory = [inventoryItem('cannon')];
    player.currentInventoryKey = 1;
  }

  private spawnForPlayer(player: PlayerState): { x: number; y: number } | undefined {
    const teamSpawners = player.team === 'none' ? [] : this.level.spawners.filter((spawner) => flagTeam(spawner) === player.team);
    const candidates = teamSpawners.length > 0 ? teamSpawners : this.level.spawners;
    const free = candidates.find((spawner) => !this.blockedAt(player, spawner.x, spawner.y));
    if (free) return free;
    return this.freeSpaceNearSpawners(player, candidates) ?? candidates[0];
  }

  private freeSpaceNearSpawners(player: PlayerState, spawners: StaticEntity[]): { x: number; y: number } | undefined {
    const maxRadius = Math.max(this.level.width, this.level.height);
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      let best: { x: number; y: number; distance: number } | undefined;
      for (const spawner of spawners) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          for (let dy = -radius; dy <= radius; dy += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
            const x = spawner.x + dx * TILE_SIZE;
            const y = spawner.y + dy * TILE_SIZE;
            if (this.blockedAt(player, x, y)) continue;
            const distance = Math.hypot(dx, dy);
            if (!best || distance < best.distance) best = { x, y, distance };
          }
        }
      }
      if (best) return { x: best.x, y: best.y };
    }
    return undefined;
  }

  private isEnemy(ownerId: string | undefined, targetId: string | undefined): boolean {
    if (!ownerId || !targetId || ownerId === targetId) return false;
    const owner = this.playerById(ownerId);
    const target = this.playerById(targetId);
    if (owner?.team && target?.team && owner.team !== 'none' && target.team !== 'none') return owner.team !== target.team;
    return true;
  }

  private playerById(id: string): PlayerState | undefined {
    return this.players.get(id);
  }

  private stopHoldingFlag(player: PlayerState): void {
    if (!player.holdingFlag) return;
    this.returnFlag(player.holdingFlag);
    player.holdingFlag = undefined;
  }

  private updateBonuses(): void {
    for (const bonus of this.bonuses.values()) {
      bonus.living += 1;
      if (bonus.living > bonus.lifeTime) this.bonuses.delete(bonus.id);
    }
  }

  private manageBonusGeneration(): void {
    if (this.skippedBonusTicks++ <= BONUS_SKIP_TICKS || this.bonuses.size > MAX_BONUSES) return;
    this.skippedBonusTicks = 0;
    const cell = this.futureBonusCell();
    if (!cell) return;
    this.addBonus(BONUS_KINDS[this.bonusId % BONUS_KINDS.length], cell[0] * TILE_SIZE, cell[1] * TILE_SIZE);
  }

  private futureBonusCell(): [number, number] | undefined {
    for (let attempt = 0; attempt <= 10; attempt += 1) {
      const x = hash(this.bonusId + 1, attempt, this.level.width, 17) % this.level.width;
      const y = hash(this.bonusId + 1, attempt, this.level.height, 23) % this.level.height;
      if (this.canPlaceBonus(x, y)) return [x, y];
    }
    return undefined;
  }

  private canPlaceBonus(x: number, y: number): boolean {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const tile = this.level.tiles.find((candidate) => candidate.x === px && candidate.y === py);
    if (!tile || tile.kind === 'water') return false;
    const intersectsCell = (bx: number, by: number) => rectsIntersect(px, py, TILE_SIZE, TILE_SIZE, bx, by, TILE_SIZE, TILE_SIZE);
    return !this.level.entities.some((entity) => !entity.removed && intersectsCell(entity.x, entity.y))
      && ![...this.players.values()].some((player) => rectsIntersect(px, py, TILE_SIZE, TILE_SIZE, player.x, player.y, PLAYER_W, PLAYER_H))
      && ![...this.bonuses.values()].some((bonus) => intersectsCell(bonus.x, bonus.y));
  }

  private pickUpBonuses(player: PlayerState, now: number): void {
    for (const bonus of this.bonuses.values()) {
      if (!rectsIntersect(player.x, player.y, PLAYER_W, PLAYER_H, bonus.x, bonus.y, TILE_SIZE, TILE_SIZE)) continue;
      this.applyBonus(player, bonus, now);
      this.removeBonus(bonus.id);
    }
  }

  private removeBonus(id: string): void {
    const bonus = this.bonuses.get(id);
    this.bonuses.delete(id);
    this.consumedBonuses.add(id);
    if (bonus) this.recentBonusRemovals.push({ id, ticks: BONUS_REMOVE_BROADCAST_TICKS });
  }

  private applyBonus(player: PlayerState, bonus: BonusState, now: number): void {
    if (bonus.kind === 'small-ammo') player.ammo = Math.min(MAX_AMMO, player.ammo + 25);
    else if (bonus.kind === 'big-ammo') player.ammo = Math.min(MAX_AMMO, player.ammo + 50);
    else if (bonus.kind === 'small-med') player.hp = Math.min(100, player.hp + 25);
    else if (bonus.kind === 'big-med') player.hp = Math.min(100, player.hp + 50);
    else if (bonus.kind === 'ap-bullets') this.addPickedBonus(player, bonus.kind, now, AP_BULLETS_DURATION);
    else if (bonus.kind === 'acceleration') this.addPickedBonus(player, bonus.kind, now, ACCELERATION_DURATION);
    else if (bonus.kind === 'invulnerability') this.addPickedBonus(player, bonus.kind, now, INVULNERABILITY_DURATION);
    else if (bonus.kind === 'turret' || bonus.kind === 'mine' || bonus.kind === 'dispenser') this.addInventoryItem(player, bonus.kind);
  }

  private addInventoryItem(player: PlayerState, kind: InventoryKind): void {
    const existing = player.inventory.find((item) => item.kind === kind);
    if (existing) existing.amount += 1;
    else player.inventory.push(inventoryItem(kind));
  }

  private updateFlags(player: PlayerState): void {
    if (player.team === 'none') return;
    for (const flag of this.flags()) {
      const team = flagTeam(flag);
      if (!team) continue;
      if (!rectsIntersect(player.x, player.y, PLAYER_W, PLAYER_H, flag.x - 7.5, flag.y - 7.5, TILE_SIZE + 15, TILE_SIZE + 15)) continue;

      if (team !== player.team && !player.holdingFlag && !flag.removed) {
        player.holdingFlag = team;
        flag.flagVersion = (flag.flagVersion ?? 0) + 1;
        flag.removed = true;
        flag.solid = false;
      } else if (team === player.team && player.holdingFlag && player.holdingFlag !== player.team) {
        this.score[player.team] += 1;
        this.returnFlag(player.holdingFlag);
        player.holdingFlag = undefined;
      }
    }
  }

  private returnFlag(team: Team): void {
    const flag = this.flags().find((entity) => flagTeam(entity) === team);
    if (!flag) return;
    flag.flagVersion = (flag.flagVersion ?? 0) + 1;
    flag.removed = false;
    flag.solid = false;
  }

  private addPickedBonus(player: PlayerState, kind: BonusKind, now: number, duration: number): void {
    const existing = player.pickedBonuses.find((bonus) => bonus.kind === kind);
    if (existing) {
      existing.activationTime = now;
      existing.duration = duration;
    } else {
      player.pickedBonuses.push({ kind, activationTime: now, duration });
    }
  }

  private updateBuildings(): void {
    for (const entity of this.level.entities) {
      if (!entity.removed && entity.solid && entity.kind === 'turret' && entity.owner === this.localId) this.updateTurret(entity);
      if (!entity.removed && entity.solid && entity.kind === 'mine' && entity.owner === this.localId) this.updateMine(entity);
      if (entity.removed || entity.kind !== 'dispenser' || !entity.owner) continue;
      if (!entity.solid) continue;
      entity.energy ??= DISPENSER_ENERGY;
      entity.skippedRenewTicks ??= 0;
      if (entity.skippedRenewTicks++ <= DISPENSER_SKIP_RENEW_TICKS) continue;
      entity.skippedRenewTicks = 0;

      for (const player of this.players.values()) {
        if (player.id !== entity.owner || !inDispenserRange(entity, player)) continue;
        if (player.hp < 100) {
          player.hp = Math.min(100, player.hp + 1);
          entity.energy -= 1;
          this.addDispenseBeam(entity, player, 'dispense-heal');
        }
        if (player.ammo < MAX_AMMO) {
          player.ammo = Math.min(MAX_AMMO, player.ammo + 1);
          entity.energy -= 1;
          this.addDispenseBeam(entity, player, 'dispense-ammo');
        }
      }

      if (entity.energy <= 0) {
        entity.removed = true;
        entity.solid = false;
      }
    }
  }

  private updateMine(entity: StaticEntity): void {
    entity.countdown ??= false;
    entity.skippedExplTicks ??= 0;
    if (!entity.countdown) return;
    if (entity.skippedExplTicks++ < MINE_EXPLOSION_DELAY) return;
    this.explodeMine(entity);
    entity.removed = true;
    entity.solid = false;
  }

  private explodeMine(entity: StaticEntity): void {
    const targets: Array<{ x: number; y: number; damage: (amount: number) => void }> = [];
    for (const candidate of this.level.entities) {
      if (candidate === entity || candidate.removed || !isDamageableByMine(candidate) || !this.isEnemy(entity.owner, candidate.owner)) continue;
      if (mineRangeIntersects(entity, candidate.x, candidate.y, TILE_SIZE, TILE_SIZE)) {
        targets.push({ x: candidate.x, y: candidate.y, damage: (amount) => this.damageEntity(candidate, amount) });
      }
    }
    for (const player of this.players.values()) {
      if (!this.isEnemy(entity.owner, player.id) || !mineRangeIntersects(entity, player.x, player.y, PLAYER_W, PLAYER_H)) continue;
      targets.push({ x: player.x, y: player.y, damage: (amount) => this.damagePlayer(player, entity.owner ?? '', amount, `${entity.id ?? 'mine'}:${player.id}:${entity.skippedExplTicks}`) });
    }
    targets.sort((a, b) => distanceSquared(a.x, a.y, entity.x, entity.y) - distanceSquared(b.x, b.y, entity.x, entity.y));

    let damage = MINE_MAX_DAMAGE;
    for (const target of targets) {
      target.damage(Math.max(0, damage));
      damage -= MINE_DAMAGE_DELTA;
    }
    this.addMineExplosionParticles(entity);
  }

  private updateTurret(entity: StaticEntity): void {
    entity.direction ??= Direction.Up;
    entity.lastShot ??= performance.now();
    entity.skippedAnimTicks ??= 0;

    if (entity.skippedAnimTicks++ > 12) {
      entity.skippedAnimTicks = 0;
      const next = entity.direction + 1;
      entity.direction = next >= 4 ? 4 - next : next;
    }

    const playerTargetDirection = this.findTurretPlayerTarget(entity);
    if (playerTargetDirection !== undefined) {
      entity.direction = playerTargetDirection;
      this.shootTurret(entity);
      return;
    }

    const turretTargetDirection = this.findTurretTarget(entity);
    if (turretTargetDirection !== undefined) {
      entity.direction = turretTargetDirection;
      this.shootTurret(entity);
    }
  }

  private findTurretPlayerTarget(entity: StaticEntity): Direction | undefined {
    let closest = Number.POSITIVE_INFINITY;
    let direction: Direction | undefined;
    for (let candidateDirection = 0; candidateDirection < 4; candidateDirection += 1) {
      const players = [...this.players.values()]
        .filter((player) => this.isEnemy(entity.owner, player.id) && turretRangeIntersects(entity, candidateDirection, player.x, player.y, PLAYER_W, PLAYER_H))
        .sort((a, b) => distanceSquared(a.x, a.y, entity.x, entity.y) - distanceSquared(b.x, b.y, entity.x, entity.y));
      if (!players.length) continue;
      const distance = distanceSquared(players[0].x, players[0].y, entity.x, entity.y);
      if (candidateDirection === Direction.Down || distance < closest) {
        closest = distance;
        direction = candidateDirection;
      }
    }
    return direction;
  }

  private findTurretTarget(entity: StaticEntity): Direction | undefined {
    let closest = Number.POSITIVE_INFINITY;
    let direction: Direction | undefined;
    for (let candidateDirection = 0; candidateDirection < 4; candidateDirection += 1) {
      const turrets = this.level.entities
        .filter((candidate) => !candidate.removed && candidate.kind === 'turret' && this.isEnemy(entity.owner, candidate.owner) && turretRangeIntersects(entity, candidateDirection, candidate.x, candidate.y, TURRET_SIZE, TURRET_SIZE))
        .sort((a, b) => distanceSquared(a.x, a.y, entity.x, entity.y) - distanceSquared(b.x, b.y, entity.x, entity.y));
      if (!turrets.length) continue;
      const distance = distanceSquared(turrets[0].x, turrets[0].y, entity.x, entity.y);
      if (distance < closest) {
        closest = distance;
        direction = candidateDirection;
      }
    }
    return direction;
  }

  private shootTurret(entity: StaticEntity): void {
    const now = performance.now();
    if (now - (entity.lastShot ?? now) <= TURRET_SHOT_DELAY || !entity.owner) return;
    entity.lastShot = now;
    const [bx, by] = turretBulletOrigin(entity);
    const id = `${entity.owner}:${entity.id ?? `${entity.x}:${entity.y}`}:${Math.round(now)}`;
    this.bullets.set(id, { id, owner: entity.owner, x: bx, y: by, direction: entity.direction ?? Direction.Up, ap: false });
    this.addBarrelFlameForEntity(entity, id);
    this.sounds.play('shoot');
  }

  private updatePickedBonuses(player: PlayerState, now: number): void {
    for (let i = player.pickedBonuses.length - 1; i >= 0; i -= 1) {
      const bonus = player.pickedBonuses[i];
      if (now - bonus.activationTime > bonus.duration) player.pickedBonuses.splice(i, 1);
    }
  }

  private hasActiveBonus(player: PlayerState, kind: BonusKind, now: number): boolean {
    return player.pickedBonuses.some((bonus) => bonus.kind === kind && now - bonus.activationTime <= bonus.duration);
  }

  private maxSpeed(player: PlayerState, now: number): number {
    return this.hasActiveBonus(player, 'acceleration', now) ? MAX_SPEED * 2 : MAX_SPEED;
  }

  private damageEntity(entity: StaticEntity, damage: number): void {
    if (entity.kind !== 'wall' && entity.kind !== 'turret' && entity.kind !== 'mine' && entity.kind !== 'dispenser') return;
    entity.health = Math.max(0, entity.health - damage);
    if (entity.health === 0) {
      if (entity.kind === 'wall') this.addWallDebris(entity);
      if (entity.kind === 'mine') {
        entity.countdown = true;
        entity.skippedExplTicks = 0;
      } else {
        entity.removed = true;
        entity.solid = false;
      }
    }
  }

  private playEntityHitSound(entity: StaticEntity): void {
    if (entity.kind === 'metal' || entity.kind === 'turret' || entity.kind === 'mine' || entity.kind === 'dispenser') this.sounds.play('metal-hit');
    else if (entity.kind === 'wall') this.sounds.play('brick-hit');
  }

  private addEntityHitParticle(bullet: BulletState, entity: StaticEntity): void {
    const kind = entity.kind === 'metal' || entity.kind === 'turret' || entity.kind === 'mine' || entity.kind === 'dispenser' ? 'spark' : entity.kind === 'wall' ? 'brick-dust' : undefined;
    if (!kind) return;
    this.particles.push({
      id: `${kind}:${bullet.id}`,
      kind,
      x: bullet.x,
      y: bullet.y,
      direction: bullet.direction,
      living: 0,
      lifeTime: 4,
      animationState: 0,
      animationStates: 3,
      debrisFrame: 0,
    });
  }

  private addWallDebris(entity: StaticEntity): void {
    this.particles.push({
      id: `wall-debris:${entity.x}:${entity.y}:${this.particles.length}`,
      kind: 'wall-debris',
      x: entity.x,
      y: entity.y,
      direction: Direction.Down,
      living: 0,
      lifeTime: 250,
      animationState: 0,
      animationStates: 10,
      debrisFrame: arbitraryFrame(entity.x, entity.y, 2),
    });
  }

  private addRobotDebris(player: PlayerState): void {
    this.particles.push({
      id: `robot-debris:${player.id}:${player.deaths + 1}`,
      kind: 'robot-debris',
      x: player.x,
      y: player.y,
      direction: player.direction,
      living: 0,
      lifeTime: 250,
      animationState: 0,
      animationStates: 9,
      debrisFrame: arbitraryFrame(player.x, player.y, player.direction),
    });
  }

  private addDispenseBeam(entity: StaticEntity, player: PlayerState, kind: 'dispense-heal' | 'dispense-ammo'): void {
    this.particles.push({
      id: `${kind}:${entity.id ?? `${entity.x}:${entity.y}`}:${player.id}:${this.particles.length}`,
      kind,
      x: entity.x + (player.x - entity.x) / 2 + arbitraryFrame(entity.x, player.x, this.particles.length) * 2,
      y: entity.y + (player.y - entity.y) / 2 + arbitraryFrame(entity.y, player.y, this.particles.length) * 2,
      direction: Direction.Down,
      living: 0,
      lifeTime: 20,
      animationState: 0,
      animationStates: 2,
      debrisFrame: 0,
    });
  }

  private addMineExplosionParticles(entity: StaticEntity): void {
    const minX = Math.max(0, Math.floor((entity.x - MINE_RANGE / 2) / TILE_SIZE));
    const maxX = Math.min(this.level.width - 1, Math.floor((entity.x + MINE_RANGE) / TILE_SIZE));
    const minY = Math.max(0, Math.floor((entity.y - MINE_RANGE / 2) / TILE_SIZE));
    const maxY = Math.min(this.level.height - 1, Math.floor((entity.y + MINE_RANGE) / TILE_SIZE));

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (!mineRangeIntersects(entity, px, py, TILE_SIZE, TILE_SIZE)) continue;
        if (this.level.entities.some((candidate) => {
          const [cw, ch] = entitySize(candidate);
          return !candidate.removed && candidate !== entity && rectsIntersect(px, py, TILE_SIZE, TILE_SIZE, candidate.x, candidate.y, cw, ch);
        })) continue;
        this.particles.push({
          id: `mine-explosion:${entity.id ?? `${entity.x}:${entity.y}`}:${x}:${y}`,
          kind: 'mine-explosion',
          x: px,
          y: py,
          direction: Direction.Down,
          living: 0,
          lifeTime: 5,
          animationState: 0,
          animationStates: 0,
          debrisFrame: Math.min(5, arbitraryFrame(px, py, 3) + arbitraryFrame(px, py, 5)),
        });
      }
    }
  }

  private changedWalls(): WallState[] {
    return this.level.entities
      .filter((entity) => entity.kind === 'wall' && (entity.removed || entity.health !== entity.maxHealth))
      .map((entity) => ({ x: entity.x, y: entity.y, health: entity.health, removed: entity.removed }));
  }

  private flags(): StaticEntity[] {
    return this.level.entities.filter((entity) => entity.kind === 'flag-red' || entity.kind === 'flag-blu');
  }

  private ownedBuildings(ownerId: string): StaticEntity[] {
    return this.level.entities
      .filter((entity) => isPlacedBuilding(entity) && entity.owner === ownerId)
      .map((entity) => ({ ...entity }));
  }

  private replaceRemoteBullets(ownerId: string, bullets: BulletState[]): void {
    for (const bullet of this.bullets.values()) {
      if (bullet.owner === ownerId) this.bullets.delete(bullet.id);
    }
    for (const bullet of bullets) {
      if (bullet.owner !== this.localId && !this.consumedRemoteBullets.has(bullet.id)) this.bullets.set(bullet.id, { ...bullet });
    }
  }

  private consumeBullet(bullet: BulletState): void {
    if (bullet.owner !== this.localId) this.consumedRemoteBullets.add(bullet.id);
  }

  private replaceRemoteBonuses(ownerId: string, bonuses: BonusState[]): void {
    for (const bonus of this.bonuses.values()) {
      if (bonus.owner === ownerId) this.bonuses.delete(bonus.id);
    }
    for (const bonus of bonuses) {
      if (bonus.owner !== this.localId && !this.consumedBonuses.has(bonus.id)) this.bonuses.set(bonus.id, { ...bonus });
    }
  }

  private applyBonusRemovals(ids: string[]): void {
    for (const id of ids) {
      this.consumedBonuses.add(id);
      this.bonuses.delete(id);
    }
  }

  private replaceRemoteBuildings(ownerId: string, buildings: StaticEntity[]): void {
    if (ownerId === this.localId) return;
    for (let i = this.level.entities.length - 1; i >= 0; i -= 1) {
      const entity = this.level.entities[i];
      if (isPlacedBuilding(entity) && entity.owner === ownerId) this.level.entities.splice(i, 1);
    }
    for (const building of buildings) {
      if (building.owner === this.localId || !isPlacedBuilding(building)) continue;
      this.level.entities.push({ ...building });
    }
  }

  private applyFlagStates(flags: StaticEntity[]): void {
    for (const flag of flags) {
      const entity = this.level.entities.find((candidate) => candidate.kind === flag.kind && flagTeam(candidate) !== undefined);
      if (!entity) continue;
      const localVersion = entity.flagVersion ?? 0;
      const remoteVersion = flag.flagVersion ?? 0;
      if (remoteVersion < localVersion) continue;
      entity.flagVersion = remoteVersion;
      entity.removed = flag.removed;
      entity.solid = false;
    }
  }

  private applyScore(score?: { red: number; blu: number }): void {
    if (!score) return;
    this.score.red = Math.max(this.score.red, score.red);
    this.score.blu = Math.max(this.score.blu, score.blu);
  }

  private applyWallStates(walls: WallState[]): void {
    for (const wall of walls) {
      const entity = this.level.entities.find((candidate) => candidate.kind === 'wall' && candidate.x === wall.x && candidate.y === wall.y);
      if (!entity) continue;
      entity.health = wall.health;
      entity.removed = wall.removed;
      entity.solid = !wall.removed;
    }
  }

  private applyHits(hits: HitState[]): void {
    for (const hit of hits) {
      if (hit.target !== this.localId || this.consumedRemoteBullets.has(hit.id)) continue;
      this.consumedRemoteBullets.add(hit.id);
      this.damagePlayer(this.localPlayer, hit.owner, hit.damage);
      this.bullets.delete(hit.id);
    }
  }

  private updateRecentHits(): void {
    for (let i = this.recentHits.length - 1; i >= 0; i -= 1) {
      this.recentHits[i].ticks -= 1;
      if (this.recentHits[i].ticks <= 0) this.recentHits.splice(i, 1);
    }
  }

  private updateRecentBonusRemovals(): void {
    for (let i = this.recentBonusRemovals.length - 1; i >= 0; i -= 1) {
      this.recentBonusRemovals[i].ticks -= 1;
      if (this.recentBonusRemovals[i].ticks <= 0) this.recentBonusRemovals.splice(i, 1);
    }
  }

  private addBarrelFlame(player: PlayerState, id: string): void {
    this.particles.push({
      id: `barrel-flame:${id}`,
      kind: 'barrel-flame',
      x: player.x,
      y: player.y,
      direction: player.direction,
      living: 0,
      lifeTime: 2,
      animationState: 0,
      animationStates: 0,
      debrisFrame: 0,
    });
  }

  private addBarrelFlameForEntity(entity: StaticEntity, id: string): void {
    this.particles.push({
      id: `barrel-flame:${id}`,
      kind: 'barrel-flame',
      x: entity.x,
      y: entity.y,
      direction: entity.direction ?? Direction.Up,
      living: 0,
      lifeTime: 2,
      animationState: 0,
      animationStates: 0,
      debrisFrame: 0,
    });
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      if (particle.living++ > particle.lifeTime) this.particles.splice(i, 1);
      else if (particle.animationState <= particle.animationStates) particle.animationState += 1;
    }
  }

  private updateWaterTiles(): void {
    for (const tile of this.level.tiles) {
      if (tile.kind !== 'water') continue;
      if (tile.skippedRedrawTicks++ > WATER_SKIP_REDRAW_TICKS) {
        tile.skippedRedrawTicks = 0;
        tile.frame = nextArbitraryFrame(tile.x, tile.y, tile.frame, tile.frame);
      }
    }
  }

  private centerCamera(player: PlayerState): void {
    this.cameraX = clamp(player.x + PLAYER_W / 2 - this.canvas.width / 2, 0, Math.max(0, this.level.width * TILE_SIZE - this.canvas.width));
    this.cameraY = clamp(player.y + PLAYER_H / 2 - this.canvas.height / 2, 0, Math.max(0, this.level.height * TILE_SIZE - this.canvas.height));
  }
}

function rectsIntersect(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gunOffsetX(direction: Direction): number {
  if (direction === Direction.Right) return -10;
  if (direction === Direction.Left) return 10;
  return 0;
}

function gunOffsetY(direction: Direction): number {
  if (direction === Direction.Down) return -10;
  if (direction === Direction.Up) return 10;
  return 0;
}

function bulletOrigin(player: PlayerState): [number, number] {
  if (player.direction === Direction.Up) return [player.x + PLAYER_W / 2 - BULLET_SIZE / 2, player.y - 4];
  if (player.direction === Direction.Right) return [player.x + PLAYER_W, player.y + PLAYER_H / 2];
  if (player.direction === Direction.Down) return [player.x + PLAYER_W / 2 - BULLET_SIZE / 2 + 1, player.y + PLAYER_H];
  return [player.x - BULLET_SIZE - 5, player.y + PLAYER_H / 2 + 1];
}

function turretBulletOrigin(entity: StaticEntity): [number, number] {
  const direction = entity.direction ?? Direction.Up;
  if (direction === Direction.Up) return [entity.x + TURRET_SIZE / 2 - BULLET_SIZE / 2 + 3, entity.y - 5];
  if (direction === Direction.Right) return [entity.x + TURRET_SIZE + 4, entity.y + TURRET_SIZE / 2 + 1];
  if (direction === Direction.Down) return [entity.x + TURRET_SIZE / 2 - BULLET_SIZE / 2 + 3, entity.y + TURRET_SIZE + 3];
  return [entity.x - BULLET_SIZE - 4, entity.y + TURRET_SIZE / 2 + 4];
}

function turretRangeIntersects(entity: StaticEntity, direction: Direction, x: number, y: number, w: number, h: number): boolean {
  const range = turretRangeRect(entity, direction);
  return rectsIntersect(range.x, range.y, range.w, range.h, x, y, w, h);
}

function turretRangeRect(entity: StaticEntity, direction: Direction): { x: number; y: number; w: number; h: number } {
  if (direction === Direction.Up) return { x: entity.x, y: entity.y + TURRET_SIZE / 2 - TURRET_RANGE / 2, w: TURRET_SIZE, h: TURRET_RANGE / 2 };
  if (direction === Direction.Right) return { x: entity.x + TURRET_SIZE / 2, y: entity.y, w: TURRET_RANGE / 2, h: TURRET_SIZE };
  if (direction === Direction.Down) return { x: entity.x, y: entity.y + TURRET_SIZE / 2, w: TURRET_SIZE, h: TURRET_RANGE / 2 };
  return { x: entity.x + TURRET_SIZE / 2 - TURRET_RANGE / 2, y: entity.y, w: TURRET_RANGE / 2, h: TURRET_SIZE };
}

function barrelFlameOffset(direction: Direction): [number, number] {
  if (direction === Direction.Up) return [PLAYER_W / 2 - BULLET_SIZE / 2 - 1 - 12, -4 - 12];
  if (direction === Direction.Right) return [PLAYER_W - 3 - 12, PLAYER_H / 2 - 1.5 - 12];
  if (direction === Direction.Down) return [PLAYER_W / 2 - BULLET_SIZE / 2 - 1 - 12, PLAYER_H - 3 - 12];
  return [-BULLET_SIZE - 4 - 12, PLAYER_H / 2 - 1 - 12];
}

function oppositeDirection(direction: Direction): Direction {
  if (direction === Direction.Up) return Direction.Down;
  if (direction === Direction.Right) return Direction.Left;
  if (direction === Direction.Down) return Direction.Up;
  return Direction.Right;
}

function sparkOffset(direction: Direction): [number, number] {
  if (direction === Direction.Left) return [-14, -13];
  if (direction === Direction.Right) return [-14, -11];
  if (direction === Direction.Up) return [-12, -12];
  return [-14, -14];
}

function brickDustOffset(direction: Direction): [number, number] {
  if (direction === Direction.Left) return [-11, -13];
  if (direction === Direction.Right) return [-15, -13];
  if (direction === Direction.Up) return [-12, -11];
  return [-14, -16];
}

function arbitraryFrame(x: number, y: number, seed: number): number {
  const generated = (Math.imul(Math.round(x), 374761393) + Math.imul(Math.round(y), 668265263) + Math.imul(seed, 1274126177)) >>> 0;
  if (generated % 128 < 64) return 0;
  return generated % 2 === 0 ? 1 : 2;
}

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function bonusImageIndex(kind: BonusKind): number {
  if (kind === 'big-ammo') return 0;
  if (kind === 'big-med') return 1;
  if (kind === 'ap-bullets') return 2;
  if (kind === 'invulnerability') return 3;
  if (kind === 'acceleration') return 4;
  if (kind === 'small-med') return 5;
  if (kind === 'small-ammo') return 6;
  if (kind === 'turret') return 7;
  if (kind === 'mine') return 8;
  return 10;
}

function inventoryItem(kind: InventoryKind): InventoryItemState {
  if (kind === 'turret') return { kind, activationKey: 2, imageIndex: 7, amount: 1 };
  if (kind === 'mine') return { kind, activationKey: 3, imageIndex: 8, amount: 1 };
  if (kind === 'dispenser') return { kind, activationKey: 4, imageIndex: 10, amount: 1 };
  return { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 };
}

function placedEntity(kind: InventoryKind, owner: string, x: number, y: number, id: string): StaticEntity | undefined {
  if (kind === 'turret') return { id, owner, x, y, kind: 'turret', solid: true, health: 125, maxHealth: 125, removed: false, direction: Direction.Up, lastShot: performance.now(), skippedAnimTicks: 0 };
  if (kind === 'mine') return { id, owner, x, y, kind: 'mine', solid: true, health: 1, maxHealth: 1, removed: false, direction: Direction.Up, countdown: false, skippedExplTicks: 0 };
  if (kind === 'dispenser') return { id, owner, x, y, kind: 'dispenser', solid: true, health: 75, maxHealth: 75, removed: false, direction: Direction.Up, energy: DISPENSER_ENERGY, skippedRenewTicks: 0 };
  return undefined;
}

function isPlacedBuilding(entity: StaticEntity): boolean {
  return entity.kind === 'turret' || entity.kind === 'mine' || entity.kind === 'dispenser';
}

function inventoryKindForEntity(entity: StaticEntity): InventoryKind | undefined {
  if (entity.kind === 'turret' || entity.kind === 'mine' || entity.kind === 'dispenser') return entity.kind;
  return undefined;
}

function isDamageableByMine(entity: StaticEntity): boolean {
  return entity.kind === 'wall' || entity.kind === 'turret' || entity.kind === 'mine' || entity.kind === 'dispenser';
}

function flagTeam(entity: StaticEntity): Team | undefined {
  if (entity.kind === 'flag-red' || entity.kind === 'spawner-red') return 'red';
  if (entity.kind === 'flag-blu' || entity.kind === 'spawner-blu') return 'blu';
  return undefined;
}

function entitySize(entity: StaticEntity): [number, number] {
  if (entity.kind === 'turret') return [TURRET_SIZE, TURRET_SIZE];
  if (entity.kind === 'mine') return [MINE_SIZE, MINE_SIZE];
  return [TILE_SIZE, TILE_SIZE];
}

function inDispenserRange(entity: StaticEntity, player: PlayerState): boolean {
  const dx = player.x + PLAYER_W / 2 - (entity.x + TILE_SIZE / 2);
  const dy = player.y + PLAYER_H / 2 - (entity.y + TILE_SIZE / 2);
  return Math.sqrt(dx * dx + dy * dy) <= DISPENSER_RANGE / 2;
}

function mineRangeIntersects(entity: StaticEntity, x: number, y: number, w: number, h: number): boolean {
  return rectsIntersect(entity.x, entity.y, MINE_RANGE, MINE_RANGE, x, y, w, h);
}

function interactionRange(player: PlayerState): { x: number; y: number; w: number; h: number } {
  if (player.direction === Direction.Up) return { x: player.x, y: player.y - 4, w: PLAYER_W, h: PLAYER_H };
  if (player.direction === Direction.Right) return { x: player.x, y: player.y, w: PLAYER_W + 8, h: PLAYER_H };
  if (player.direction === Direction.Down) return { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H + 8 };
  return { x: player.x - 8, y: player.y, w: PLAYER_W, h: PLAYER_H };
}

function previousInventoryKey(inventory: InventoryItemState[], currentKey: number): number {
  for (let key = currentKey - 1; key >= 1; key -= 1) {
    if (inventory.some((item) => item.activationKey === key)) return key;
  }
  return inventory[0]?.activationKey ?? 1;
}

function inventoryFieldSprite(kind: InventoryKind): [number, number] {
  if (kind === 'turret') return [0, 16];
  if (kind === 'mine') return [8, 1];
  if (kind === 'dispenser') return [10, 1];
  return [1, 9];
}

function inventoryHologramIndex(kind: InventoryKind): number {
  if (kind === 'dispenser') return 1;
  if (kind === 'mine') return 2;
  return 0;
}

function inventoryRenderOffset(direction: Direction): [number, number] {
  if (direction === Direction.Up) return [-2, -8];
  if (direction === Direction.Right) return [4, -2];
  if (direction === Direction.Down) return [-2, 4];
  return [-8, -2];
}

function newEntityOffset(player: PlayerState): [number, number] {
  let xo = 0;
  let yo = 0;
  if (player.direction === Direction.Up) yo = -TILE_SIZE;
  if (player.direction === Direction.Right) xo = TILE_SIZE;
  if (player.direction === Direction.Down) yo = TILE_SIZE;
  if (player.direction === Direction.Left) xo = -TILE_SIZE;

  const xt = Math.floor(player.x / TILE_SIZE * 3);
  const yt = Math.floor(player.y / TILE_SIZE * 3);
  const xtDiff = player.x - xt * TILE_SIZE / 3;
  const ytDiff = player.y - yt * TILE_SIZE / 3;

  if (player.direction === Direction.Up || player.direction === Direction.Down) {
    const roundedYt = Math.round((player.y + yo) / TILE_SIZE * 3);
    const roundedYtDiff = player.y + yo - roundedYt * TILE_SIZE / 3;
    xo -= xtDiff;
    yo -= roundedYtDiff - 1;
  } else {
    const roundedXt = Math.round((player.x + xo) / TILE_SIZE * 3);
    const roundedXtDiff = player.x + xo - roundedXt * TILE_SIZE / 3;
    xo -= roundedXtDiff;
    yo -= ytDiff;
  }

  return [xo, yo];
}

function normalizePlayerState(state: PlayerState): PlayerState {
  return {
    ...state,
    pickedBonuses: state.pickedBonuses ?? [],
    inventory: state.inventory?.length ? state.inventory : [inventoryItem('cannon')],
    currentInventoryKey: state.currentInventoryKey ?? 1,
    team: state.team ?? 'none',
    holdingFlag: state.holdingFlag,
    carriedBuildingId: state.carriedBuildingId,
  };
}

function hash(a: number, b: number, c: number, d: number): number {
  let value = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647) + Math.imul(d | 0, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

function moveBullet(bullet: BulletState): void {
  const speed = bullet.ap ? BULLET_SPEED * 1.5 : BULLET_SPEED;
  if (bullet.direction === Direction.Up) bullet.y -= speed;
  if (bullet.direction === Direction.Right) bullet.x += speed;
  if (bullet.direction === Direction.Down) bullet.y += speed;
  if (bullet.direction === Direction.Left) bullet.x -= speed;
}

function directionForCode(code: string | undefined): Direction | undefined {
  if (code === 'KeyA' || code === 'ArrowLeft') return Direction.Left;
  if (code === 'KeyD' || code === 'ArrowRight') return Direction.Right;
  if (code === 'KeyW' || code === 'ArrowUp') return Direction.Up;
  if (code === 'KeyS' || code === 'ArrowDown') return Direction.Down;
  return undefined;
}

function directionForVector(x: number, y: number): Direction | undefined {
  if (x < 0) return Direction.Left;
  if (x > 0) return Direction.Right;
  if (y < 0) return Direction.Up;
  if (y > 0) return Direction.Down;
  return undefined;
}

function unitHue(id: string): number {
  const numeric = Number(id);
  const colorId = Number.isFinite(numeric) ? numeric : stableColorId(id);
  const hue = 25.0 * colorId;
  return hue > 255 ? hue * Math.cos(colorId) : hue;
}

function stableColorId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return Math.abs(hash % 16);
}

function writeCentered(ctx: CanvasRenderingContext2D, assets: Assets, text: string, size: 1 | 2, y: number, width: number): void {
  const letterSize = 8 * size;
  writeFont(ctx, assets, text, size, Math.round((width - text.length * letterSize) / 2), y);
}
