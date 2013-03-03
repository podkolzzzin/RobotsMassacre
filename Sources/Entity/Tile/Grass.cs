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
    public class Grass : GTile
    {
        private int GrassState = GetArbitraryAnimationFrame();
        private int ShoreState = GetArbitraryAnimationFrame();

        public override int Type { get { return TileType.GRASS; } }

        public Grass(float x, float y) : base(x, y, true) { }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.GRAPHICS[1 + GrassState, 4], iX, iY);
        }

        public static bool IsShoreAcceptable(GEntity Tile)
        {
            return Tile.Type == TileType.WATER || Tile.Type == TileType.GRAVEL || Tile.Type == TileType.SAND;
        }
    }
}