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
    public class Gravel : GTile
    {
        private int GravelState = GetArbitraryAnimationFrame();

        public override int Type { get { return TileType.GRAVEL; } }

        public Gravel(float x, float y) : base(x, y, true) { }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.GRAPHICS[GravelState, 3], iX, iY);
        }

        public static bool IsShoreAcceptable(GEntity Tile)
        {
            return Tile.Type == TileType.WATER;
        }
    }
}