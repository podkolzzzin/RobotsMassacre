using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity.Tile;
using Gfx;

namespace Entity.Details
{
    public class Flower : GDetail
    {
        public static new readonly int WIDTH = 9;
        public static new readonly int HEIGHT = 9;

        private int FlowerState = GetArbitraryAnimationFrame();

        public override int Type { get { return TileType.D_FLOWER; } }

        public Flower(float x, float y) : base(x, y) { }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.GRAPHICS[7 + FlowerState, 4], iX, iY);
        }
    }
}