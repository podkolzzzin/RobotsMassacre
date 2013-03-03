using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
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

namespace Entity
{
    public class Mine : GEntity
    {
        private static readonly int WIDTH = 22;
        private static readonly int HEIGHT = 22;
        private new const int R = 50;
        private const int MAX_DAMAGE = 100;
        private const int DAMAGE_DELTA = 5;

        private Range ExplosionRange;

        private const int EXPL_DELAY = 25;
        private int SkippedExplTicks = 0;
        public bool Countdown = false;

        public override bool CanPass { get { return !Enabled; } }
        public override bool IsMetallic { get { return true; } }
        public override bool Draggable { get { return true; } }

        public override int Type { get { return EntityType.MINE; } }

        public Mine(int Owner, float x, float y) : base(Owner, x, y, WIDTH, HEIGHT, Directions.Unknown, 1, 1) { }

        public Mine(int Owner, float x, float y, bool Countdown)
            : base(Owner, x, y, WIDTH, HEIGHT, Directions.Unknown, 1, 1)
        {
            this.Countdown = Countdown;
        }

        protected override void OnBindingMasterMovingEvent()
        {
            ExplosionRange.X = X;
            ExplosionRange.Y = Y;
        }

        public override void Update()
        {
            if (ExplosionRange == null)
            {
                this.ExplosionRange = new Range(X, Y, R);
                this.Owner = Owner;
            }

            base.Update();

            if (Countdown)
            {
                if (SkippedExplTicks++ >= EXPL_DELAY)
                {
                    Explode();
                    base.Remove();
                    Die();
                }
            }
        }

        public override void Render(GBitmap screen)
        {
            if (Enabled)
            {
                if (HasFocus)
                {
                    screen.DrawRect(Color.White, 1, iX, iY, 30, 30);
                    screen.FillCircle(Color.FromArgb(100, 255, 255, 255), ExplosionRange.iX - R / 2 + WIDTH / 2, ExplosionRange.iY - R / 2 + HEIGHT / 2, ExplosionRange.W, ExplosionRange.H);
                }

                screen.Blit(Art.GRAPHICS[7, 1], iX, iY);

                if (Countdown) GFont.Write(screen, "" + (EXPL_DELAY - SkippedExplTicks), 1, iX+screen.XOffset, iY+screen.YOffset);
            }
        }

        public override void Remove()
        {
            Countdown = true;
        }

        public override void Die()
        {
            foreach (GEntity Tile in GameLevel.GetIntersectingTiles(ExplosionRange))
            {
                if (GameLevel.GetIntersectingEntities(Tile).Count == 0)
                {
                    GameLevel.AddParticle(new MineExplosion(Tile.X, Tile.Y));
                }
            }
        }

        private void Explode()
        {
            List<GEntity> EntitiesAround = GameLevel.GetIntersectingEntities(ExplosionRange, IntersectionType.BY_DIFF_OWNER);
            foreach (GEntity P in GameLevel.GetIntersectingPlayers(ExplosionRange, IntersectionType.BY_DIFF_OWNER)) EntitiesAround.Add(P);

            if (EntitiesAround.Count > 0)
            {
                EntitiesAround.Sort(
                    delegate(GEntity A, GEntity B)
                    {
                        return GetTwoPointsDist(A.X, X, A.Y, Y).CompareTo(GetTwoPointsDist(B.X, X, B.Y, Y));
                    }
                );

                int Damage = MAX_DAMAGE;

                foreach (GEntity E in EntitiesAround)
                {
                    E.Damage(Damage);
                    Damage -= DAMAGE_DELTA;
                }
            }
        }

        public override string ToString()
        {
            return (new MineInv()).ToString();
        }
    }
}