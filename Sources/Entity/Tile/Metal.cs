using Gfx;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity.Tile
{
    public class Metal : GTile
    {
        public override bool CanPass { get { return false; } }
        public override bool IsMetallic { get { return true; } }

        public override int Type { get { return TileType.METAL; } }

        public Metal(float x, float y) : base(x, y, true) { }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.GRAPHICS[0, 4], iX, iY);
        }
    }
}