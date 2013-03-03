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
    public class SandTrace : GDetail
    {
        public override int Type { get { return TileType.D_SAND_TRACE; } }

        public SandTrace(float x, float y, Directions Dir) : base(x, y, Dir, true) { }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.Rotate(Art.GRAPHICS[6, 6], (int)Direction * 90), iX, iY);
        }
    }
}