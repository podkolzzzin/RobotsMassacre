using Network;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity.Particle;
using Entity.Particle.Bonus;
using Entity.Tile;
using Gui.Components;
using Inventory;
using Level;
using Gfx;
using Robots_Massacre_Client;
using Gui;

namespace Entity
{
	public class Player : GEntity
	{
		public const int WIDTH = 26;
		public const int HEIGHT = 27;
		public const int SHOT_DELAY = 400;
		public const int INIT_AMMUNITION = 75;
		public readonly int MAX_AMMUNITION = 125;
		public const float MAX_SPEED = 4.5f;

		private float MinSpeed = 0.1f;
		private float MaxSpeed = MAX_SPEED;
		private float Speed = 0.1f;
		private float SpeedDelta = 0.2f;

		public bool Disconnected = false;
		public bool Moving = false;
		public bool Shooting = false;
		public bool Controllable = false;

		private int SkippedTrackTicks = 0;
		private int TrackState = 2;
		private int SkippedAnimTicks = 0;
		private int AnimState = 0;
		private int Angle = 0;
		private int ReqAngle = 0;

		public int Ammunition = INIT_AMMUNITION;
		public string Name = GFont.GenerateString(Program.Rand.Next(4, 8));
		public int Kills = 0;
		public int Deaths = 0;

		private long LastShot = Program.GetCurrentTimeMillis();
		private List<GEntity> IntersectingTiles;

		public int CurrentInvItemAKey = 1;

		public List<Bonus> PickedBonuses = new List<Bonus>();
		public List<InvItem> Inventory = new List<InvItem>();
		public InvItem HandedItem;

		public InvItem LastUsedInvItem;

		public override bool IsMetallic { get { return true; } }

		public override int Type { get { return EntityType.PLAYER; } }

		public Player(int id, float x, float y)
			: base(id, x, y, WIDTH, HEIGHT, Directions.Down, 100, 100)
		{
			InitInventory();
		}

		public Player(int id, float x, float y, int hp)
			: base(id, x, y, WIDTH, HEIGHT, Directions.Down, hp, 100)
		{
			InitInventory();
		}

		private void InitInventory()
		{
			Inventory.Add(new CannonInv());
		}

		public void SetCoordinates(int[] Coor)
		{
			this.X = Coor[0];
			this.Y = Coor[1];
		}

		public void SetCoordinates(GEntity Coor)
		{
			this.X = Coor.X;
			this.Y = Coor.Y;
		}

		public static GEntity GetSpawnCoordinates(List<GEntity> Spawners)
		{
			return Spawners[Program.Rand.Next(Spawners.Count - 1)];
		}

		public static Teams GetTeamById(int id)
		{
			return GameLevel.GetPlayer(id).Team;
		}

		public static void IncrementKills(int id)
		{
			++GameLevel.GetPlayer(id).Kills;
			if (IsMe(id))
			{
				++GameComponent.GSettings.List.StatsKills;
			}
		}

		public static bool IsMe(int id)
		{
			return GameLevel.CurrentPlayerId == id;
		}

		public override void Update()
		{
			Shooting = false;
			UpdateMoving();
			UpdateBonuses();
			UpdateInventory();

			IntersectingTiles = GameLevel.GetIntersectingTiles(this);

			// Self-destruction, yay!
			if (GameLevel.Input.Z.Clicked) Damage(10);

			LastUsedInvItem = null;
			if (GameLevel.Input.Attack.Clicked)
			{
				LastUsedInvItem = InvItem.GetPlayersInvItem(Id, CurrentInvItemAKey);
				LastUsedInvItem.Use(Id);
			}
			else Shooting = false;

			if (SkippedAnimTicks++ > 1)
			{
				SkippedAnimTicks = 0;
				if (AnimState++ >= 2) AnimState = 0;
			}

			if (ReqAngle != 0)
			{
				Angle += 6;
				if (Angle >= ReqAngle)
				{
					ReqAngle = 0;
					Angle = 0;
				}
			}

			// =================
			// Dragging entities
			GEntity Range = null;

			if (Direction == Directions.Up) Range = new GEntity(X, Y - 4, W, H);
			if (Direction == Directions.Right) Range = new GEntity(X, Y, W + 8, H);
			if (Direction == Directions.Down) Range = new GEntity(X, Y, W, H + 8);
			if (Direction == Directions.Left) Range = new GEntity(X - 8, Y, W, H);

			List<GEntity> InRangeEntities = GameLevel.GetIntersectingEntities(Range);
			bool PassUnbindTick = false;

			if (InRangeEntities.Count > 0)
			{
				GEntity E = InRangeEntities[0];

				if (E.Draggable && E.Owner == Id)
				{
					E.HasFocus = true;
					if (GameLevel.Input.E.Clicked)
					{
						DropBindedEntity();
						E.BindMasterEntityMoving(this);
						SetSlaveEntityMoving(E);
						PassUnbindTick = true;
					}
				}
			}

			if (!PassUnbindTick && BindingMaster && GameLevel.Input.E.Clicked)
			{
				DropBindedEntity();
			}

			GameLevel.ShowGrid = !IsHolding() && BindingMaster && InvItem.GetInvItem(GetSlaveEntityMoving().ToString()).ToString().Equals("inventory-item") || CurrentInvItemAKey != 1;

			int r = 200;
			GameLevel.RevealFog(iX - r / 2 + W / 2, iY - r / 2 + H / 2, r);
		}

		// TODO
		// Refactor
		public override void Render(GBitmap screen)
		{
			int x = iX - 2;
			int y = iY - 2;

			int YAtlas = 9;
			if (BindingMaster || CurrentInvItemAKey != 1 || IsHolding()) YAtlas = 12;

			screen.Blit(Art.Rotate(Art.GRAPHICS[0, YAtlas + TrackState], (int)Direction * 90), x, y);
			Art.GRAPHICS[1, 9].ChangeHue(UnitColors.GetUnitHue(Id));

			int ol = 10;
			int ot = 10;

			if (Direction == Directions.Right)
			{
				ot *= 0;
				ol *= -1;
			}
			else if (Direction == Directions.Down)
			{
				ol *= 0;
				ot *= -1;
			}
			else if (Direction == Directions.Left)
			{
				ot *= 0;
			}
			else if (Direction == Directions.Up)
			{
				ol *= 0;
			}

			screen.Blit(Art.Rotate(Art.GRAPHICS[1, 9], (int)Direction * 90), x + ol, y + ot);

			if (IsHolding())
			{
				HandedItem.Render(screen, Id, iX, iY, Direction);
			}
			else
			{

				if (BindingMaster)
				{
					InvItem KeepingItem = InvItem.GetInvItem(GetSlaveEntityMoving().ToString());
					if (!KeepingItem.ToString().Equals("inventory-item"))
					{
						KeepingItem.Render(screen, Id, iX, iY, Direction);
						KeepingItem.RenderHologram(screen, Id, iX, iY);
					}
				}
				else if (CurrentInvItemAKey != 1)
				{
					InvItem HoldingItem = InvItem.GetInvItem(InvItem.GetNameByIndex(CurrentInvItemAKey - 1));
					HoldingItem.Render(screen, Id, iX, iY, Direction);
					HoldingItem.RenderHologram(screen, Id, iX, iY);
				}
			}

			if (!Controllable)
			{
				Color col = Color.Green;
				if (Health < MaxHealth * 1 / 3) col = Color.Red;
				else if (Health < MaxHealth * 2 / 3) col = Color.Yellow;
				screen.FillRect(col, x + 3, y + H, (int)((double)Health / MaxHealth * W), 4);
			}
		}

		private void DropBindedEntity()
		{
			GEntity SlaveEntity = GetSlaveEntityMoving();

			if (SlaveEntity != null)
			{
				int[] Offs = GameLevel.GetNewEntityOffsets();
				SlaveEntity.X = X + Offs[0];
				SlaveEntity.Y = Y + Offs[1];

				if (GameLevel.GetNonDraggableIntersectingEntities(SlaveEntity).Count > 0)
				{
					SlaveEntity.X -= Offs[0];
					SlaveEntity.Y -= Offs[1];
					AddInvItem(InvItem.FindInvItem(SlaveEntity.ToString()));
				}
				else
				{
					SlaveEntity.UnbindMasterEntityMoving();
					SetSlaveEntityMoving(null);
				}
			}
		}

		private void UpdateMoving()
		{
			float Dx = 0.0f;
			float Dy = 0.0f;

			if (GameGuiScreen.IsPlaying())
			{
				if (GameLevel.Input.Left.Down)
				{
					ReqAngle = (int)Direction * 90;
					MoveLeft(Speed);
					Dx = Speed;
				}
				else if (GameLevel.Input.Right.Down)
				{
					MoveRight(Speed);
					Dx = -Speed;
				}
				else if (GameLevel.Input.Up.Down)
				{
					MoveUp(Speed);
					Dy = Speed;
				}
				else if (GameLevel.Input.Down.Down)
				{
					MoveDown(Speed);
					Dy = -Speed;
				}
			}

			if (GameLevel.GetIntersectingEntities(this).Count > 0 || GameLevel.GetIntersectingPlayers(this, IntersectionType.BY_ID).Count > 0)
			{
				X += Dx;
				Y += Dy;
			}

			Moving = Dx != 0 || Dy != 0;
			GameLevel.CenterCameraOnPlayer();

			if (Moving)
			{
				if (Speed < MaxSpeed) Speed += SpeedDelta;
				if (SkippedTrackTicks++ > 2)
				{
					SkippedTrackTicks = 0;
					if (TrackState++ >= 2) TrackState = 0;
				}
			}
			else
			{
				Speed = MinSpeed;
				TrackState = 0;
			}
		}

		private void UpdateBonuses()
		{
			List<Bonus> IntersectingBonuses = GameLevel.GetIntersectingBonuses(this);
			foreach (Bonus B in IntersectingBonuses)
			{
				B.PickUp(Id);
				B.Remove();
			}

			for (int i = 0; i < PickedBonuses.Count; ++i)
			{
				Bonus B = PickedBonuses[i];
				B.CheckUsing();
				if (B.Used) PickedBonuses.RemoveAt(i);
			}

			SetImmortalness(Bonus.IsImmortalA());

			if (Bonus.IsAccelerationA()) MaxSpeed = MAX_SPEED * 2;
			else
			{
				MaxSpeed = MAX_SPEED;

				// If the tank is at maximum bonus speed now, then slow it down to ordinary maximum speed
				if (Speed > MaxSpeed) Speed = MaxSpeed;
			}
		}

		private void UpdateInventory()
		{
			List<int> AvailableInventory = new List<int>();

			for (int i = 0; i < Inventory.Count; ++i)
			{
				InvItem I = Inventory[i];
				if (I.Used)
				{
					Inventory.RemoveAt(i);
					CurrentInvItemAKey = InvItem.GetPrevInvAKey(Id, CurrentInvItemAKey);
				}
				else
				{
					AvailableInventory.Add(I.ActivationKey);
				}
			}

			if (GameLevel.Input._1.Clicked && AvailableInventory.IndexOf(1) != -1) CurrentInvItemAKey = 1;
			if (GameLevel.Input._2.Clicked && AvailableInventory.IndexOf(2) != -1) CurrentInvItemAKey = 2;
			if (GameLevel.Input._3.Clicked && AvailableInventory.IndexOf(3) != -1) CurrentInvItemAKey = 3;
			if (GameLevel.Input._4.Clicked && AvailableInventory.IndexOf(4) != -1) CurrentInvItemAKey = 4;
			if (GameLevel.Input._5.Clicked && AvailableInventory.IndexOf(5) != -1) CurrentInvItemAKey = 5;
			if (GameLevel.Input._6.Clicked && AvailableInventory.IndexOf(6) != -1) CurrentInvItemAKey = 6;
			if (GameLevel.Input._7.Clicked && AvailableInventory.IndexOf(7) != -1) CurrentInvItemAKey = 7;
			if (GameLevel.Input._8.Clicked && AvailableInventory.IndexOf(8) != -1) CurrentInvItemAKey = 8;
			if (GameLevel.Input._9.Clicked && AvailableInventory.IndexOf(9) != -1) CurrentInvItemAKey = 9;
		}

		private int[] GetBulletStartPositionOffsets()
		{
			int Bw = 4;
			int Bh = 0;
			int Bx = 0;
			int By = 0;

			if (Direction == Directions.Up)
			{
				Bx = W / 2 - Bw / 2;
				By = -Bh - 4;
			}
			else if (Direction == Directions.Right)
			{
				Bw = Bw + Bh;
				Bh = Bw - Bh;
				Bw = Bw - Bh;

				Bx = W;
				By = H / 2 - Bh / 2;
			}
			else if (Direction == Directions.Down)
			{
				Bx = W / 2 - Bw / 2 + 1;
				By = H;
			}
			else if (Direction == Directions.Left)
			{
				Bw = Bw + Bh;
				Bh = Bw - Bh;
				Bw = Bw - Bh;

				Bx = -Bw - 5;
				By = H / 2 - Bh / 2 + 1;
			}

			return new int[] { Bx, By };
		}

		public override void Die()
		{
			++Deaths;
			if (IsMe(Id))
			{
				++GameComponent.Gs.StatsDeaths;
			}
			GameLevel.AddParticle(new RobotDebris(X, Y, Direction));

			if (IsHolding())
			{
				StopHolding();
			}
		}

		public override void Reanimate()
		{
			base.Reanimate();
			Ammunition = INIT_AMMUNITION;
			PickedBonuses.Clear();
		}

		public void Respawn()
		{
			Teams team = Team;
			if (GameLevel.GetMode() == Modes.Deathmatch) team = Teams.NoTeam;
			SetCoordinates(GetSpawnCoordinates(GameLevel.GetSpawners(team)));
			Reanimate();
			UnbindMasterEntityMoving();
			GameLevel.CenterCameraOnPlayer();
		}

		public void AddPickedBonus(Bonus B)
		{
			Bonus FoundBonus = Bonus.FindBonus(B.ToString());
			if (FoundBonus.ToString().Equals("bonus"))
			{
				PickedBonuses.Add(B);
				B.Use(Id);
			}
			else FoundBonus.Renew(Id);
		}

		public void AddInvItem(InvItem I)
		{
			InvItem FoundInvItem = InvItem.FindInvItem(I.ToString());
			if (FoundInvItem.ToString().Equals("inventory-item")) Inventory.Add(I);
			else ++FoundInvItem.Amount;
		}

		public void Hand(GEntity e)
		{
			DropBindedEntity();
			HandedItem = e.GetAsInvItem();
			e.Disable();
		}

		public void StopHolding()
		{
			HandedItem.Parent.Enable();
			HandedItem = null;
		}

		public bool IsHolding()
		{
			return HandedItem != null;
		}

		public void AddAmmunition(int A)
		{
			Ammunition += A;
			if (Ammunition > MAX_AMMUNITION)
			{
				Ammunition = MAX_AMMUNITION;
			}
		}

		public void Shoot(bool justShoot = false)
		{
			long CurrentShot = Program.GetCurrentTimeMillis();

			if ((GameGuiScreen.IsPlaying() && !IsHolding() && !BindingMaster && !Shooting && CurrentShot - LastShot > SHOT_DELAY && Ammunition > 0) || justShoot)
			{
				if (IsMe(Id))
				{
					++GameComponent.Gs.IntStatsShots;
				}

				LastShot = CurrentShot;
				Shooting = true;
				--Ammunition;

				Sound.Shoot.Play();

				int[] Spo = GetBulletStartPositionOffsets();
				Bullet B = new Bullet(X + Spo[0], Y + Spo[1], Id, Direction, Bonus.IsAPBulletsA());
				GameLevel.AddBullet(B);

				GameLevel.AddParticle(new BarrelFlame(X, Y, Direction, false));
			}
		}
	}
}