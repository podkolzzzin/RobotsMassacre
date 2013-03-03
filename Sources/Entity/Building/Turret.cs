using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity.Particle;
using Entity.Particle.Bonus;
using Gui.Components;
using Inventory;
using Level;
using Robots_Massacre_Client;
using Gfx;

namespace Entity
{
    public class Turret : GEntity
    {
        private static readonly int MAX_HP = 125;
        public static readonly int SHOT_DELAY = 450;
        private const int SRange = 300;

        private long LastShot = Program.GetCurrentTimeMillis();
        private int SkippedAnimTicks = 0;

        public override bool CanPass { get { return !Enabled; } }
        public override bool IsMetallic { get { return true; } }
        public override bool Draggable { get { return true; } }

        public override int Type { get { return EntityType.TURRET; } }

        public Turret(int Owner, float x, float y) : base(GameLevel.GetTurretId(), Owner, x, y, 24, 24, MAX_HP, MAX_HP) { }

        public Turret(int Owner, float x, float y, int health) : base(GameLevel.GetTurretId(), Owner, x, y, 24, 24, health, MAX_HP) { }

        public override void Update()
        {
            base.Update();

            if (Enabled)
            {
                if (SkippedAnimTicks++ > 12)
                {
                    SkippedAnimTicks = 0;
                    int NewDir = (int)Direction + 1;
                    if (NewDir >= 4) Direction = (Directions)(4 - NewDir);
                    else Direction = (Directions)NewDir;
                }

                GEntity[] Ranges = new GEntity[] { 
                    new GEntity(Owner, X, Y + H / 2 - SRange / 2, W, SRange / 2, Directions.Unknown),
                    new GEntity(Owner, X + W / 2, Y, SRange / 2, H, Directions.Unknown),
                    new GEntity(Owner, X, Y + H / 2, W, SRange / 2, Directions.Unknown),
                    new GEntity(Owner, X + W / 2 - SRange / 2, Y,  SRange / 2, H, Directions.Unknown)
                };

                List<Player>[] InRangePlayers = new List<Player>[] { 
                    GameLevel.GetIntersectingPlayers(Ranges[0], IntersectionType.BY_DIFF_OWNER), 
                    GameLevel.GetIntersectingPlayers(Ranges[1], IntersectionType.BY_DIFF_OWNER),
                    GameLevel.GetIntersectingPlayers(Ranges[2], IntersectionType.BY_DIFF_OWNER),
                    GameLevel.GetIntersectingPlayers(Ranges[3], IntersectionType.BY_DIFF_OWNER)
                };

                bool PlayersInRange = false;
				double MinDist = GameComponent.GetScreenWidth() * GameComponent.GetScreenHeight();

                for (int i = 0; i < InRangePlayers.Length; ++i)
                {
                    InRangePlayers[i].Sort(
                        delegate(Player A, Player B)
                        {
                            return GetTwoPointsDist(A.X, X, A.Y, Y).CompareTo(GetTwoPointsDist(B.X, X, B.Y, Y));
                        }
                    );

                    if (InRangePlayers[i].Count > 0)
                    {
                        double Dist = GetTwoPointsDist(InRangePlayers[i][0].X, X, InRangePlayers[i][0].Y, Y);

                        if (i == 2 || Dist < MinDist)
                        {
                            MinDist = Dist;
                            Direction = (Directions)i;
                            PlayersInRange = true;
                        }
                    }
                }

                bool TurretsInRange = false;

                if (!PlayersInRange)
                {
                    List<GEntity>[] InRangeTurrets = new List<GEntity>[] { 
                        GameLevel.GetIntersectingEntities(Ranges[0], IntersectionType.BY_DIFF_OWNER), 
                        GameLevel.GetIntersectingEntities(Ranges[1], IntersectionType.BY_DIFF_OWNER),
                        GameLevel.GetIntersectingEntities(Ranges[2], IntersectionType.BY_DIFF_OWNER),
                        GameLevel.GetIntersectingEntities(Ranges[3], IntersectionType.BY_DIFF_OWNER)
                    };

					MinDist = GameComponent.GetScreenWidth() * GameComponent.GetScreenHeight();
                    List<GEntity> Turrets = new List<GEntity>();

                    for (int i = 0; i < InRangeTurrets.Length; ++i)
                    {
                        Turrets.Clear();

                        foreach (GEntity E in InRangeTurrets[i])
                        {
                            if (E.Type == EntityType.TURRET && E.Owner != Owner) Turrets.Add(E);
                        }

                        Turrets.Sort(
                            delegate(GEntity A, GEntity B)
                            {
                                return GetTwoPointsDist(A.X, X, A.Y, Y).CompareTo(GetTwoPointsDist(B.X, X, B.Y, Y));
                            }
                        );

                        if (Turrets.Count > 0)
                        {
                            double Dist = GetTwoPointsDist(Turrets[0].X, X, Turrets[0].Y, Y);

                            if (Dist < MinDist)
                            {
                                MinDist = Dist;
                                Direction = (Directions)i;
                                TurretsInRange = true;
                            }
                        }
                    }
                }

                if (PlayersInRange || TurretsInRange) Shoot();
            }
        }

        public override void Render(GBitmap screen)
        {
            if (Enabled)
            {
                if (HasFocus)
                {
                    screen.DrawRect(Color.White, 1, iX, iY, 30, 30);
                    screen.FillCircle(Color.FromArgb(100, 255, 255, 255), iX - SRange / 2 + W / 2, iY - SRange / 2 + H / 2, SRange, SRange);

                    Color col = Color.Green;
					if (Health < MaxHealth * 1 / 3) col = Color.Red;
					else if (Health < MaxHealth * 2 / 3) col = Color.Yellow;
                    screen.FillRect(col, iX, iY + H + 6, (int)((double)Health / MaxHealth * 30), 4);
                }

				Art.GRAPHICS[0, 15].ChangeHue(UnitColors.GetUnitHue(Owner));
                screen.Blit(Art.Rotate(Art.GRAPHICS[0, 15], (int)Direction * 90), iX, iY);
            }
        }

        public override void Die()
        {
            GameLevel.AddParticle(new TurretDebris(X, Y, Direction));
        }

        private int[] GetBulletStartPositionOffsets()
        {
            int Bw = 4;
            int Bh = 0;
            int Bx = 0;
            int By = 0;

            if (Direction == Directions.Up)
            {
                Bx = W / 2 - Bw / 2 + 3;
                By = -Bh - 5;
            }
            else if (Direction == Directions.Right)
            {
                Bw = Bw + Bh;
                Bh = Bw - Bh;
                Bw = Bw - Bh;

                Bx = W + 4;
                By = H / 2 - Bh / 2 + 1;
            }
            else if (Direction == Directions.Down)
            {
                Bx = W / 2 - Bw / 2 + 3;
                By = H + 3;
            }
            else if (Direction == Directions.Left)
            {
                Bw = Bw + Bh;
                Bh = Bw - Bh;
                Bw = Bw - Bh;

                Bx = -Bw - 4;
                By = H / 2 - Bh / 2 + 4;
            }

            return new int[] { Bx, By };
        }

        public void Shoot()
        {
            long CurrentShot = Program.GetCurrentTimeMillis();

            if (CurrentShot - LastShot > SHOT_DELAY)
            {
                LastShot = CurrentShot;

                Sound.Shoot.Play();

                int[] Spo = GetBulletStartPositionOffsets();
                Bullet B = new Bullet(X + Spo[0], Y + Spo[1], Id, Direction, false, true);
                GameLevel.AddBullet(B);

                GameLevel.AddParticle(new BarrelFlame(X, Y, Direction, true));
            }
        }

        public override string ToString()
        {
            return (new TurretInv()).ToString();
        }
    }
}