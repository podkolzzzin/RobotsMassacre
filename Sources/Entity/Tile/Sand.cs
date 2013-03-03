using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Level;
using Gfx;

namespace Entity.Tile
{
    public class Sand : GTile
    {
        private int SandState = GetArbitraryAnimationFrame();
        private int ShoreState = GetArbitraryAnimationFrame();

        public override int Type { get { return TileType.SAND; } }

        public Sand(float x, float y) : base(x, y, true) { }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.GRAPHICS[SandState, 6], iX, iY);
        }

        public static bool IsShoreAcceptable(GEntity Tile)
        {
            return Tile.Type == TileType.WATER || Tile.Type == TileType.GRAVEL;
        }

        public static bool IsTraceAcceptable(GEntity Tile)
        {
            return Tile.Type == TileType.GRAVEL;
        }
    }
}