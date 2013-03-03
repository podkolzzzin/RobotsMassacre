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
    public class GravelShore : Shore
    {
        public override int Type { get { return TileType.D_GRAVEL_SHORE; } }

        public GravelShore(float x, float y, Directions Dir) : base(x, y, Dir) { }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.Rotate(Art.GRAPHICS[3 + ShoreState, 3], (int)Direction * 90), iX, iY);
        }
    }
}