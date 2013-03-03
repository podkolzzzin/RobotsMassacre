using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity.Particle;
using Level;
using Gfx;

namespace Entity.Tile
{
    public class Wall : GTile
    {
        private static readonly int MAX_HP = 60;

        public override bool CanPass { get { return false; } }
        public override bool IsBrick { get { return true; } }
		public override bool IsStatic { get { return false; } }

        public override int Type { get { return TileType.WALL; } }

        public Wall(float x, float y) : base(x, y, MAX_HP) { }

        public Wall(float x, float y, int health) : base(x, y, health) { }

        public override void Die()
        {
            GameLevel.AddParticle(new WallDebris(X, Y));
        }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.GRAPHICS[(int)Math.Round((double)MAX_HP / Health) - 1, 2], iX, iY);
        }
    }
}