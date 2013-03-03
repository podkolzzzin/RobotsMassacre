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
	public class Water : GTile
	{
		private readonly int SKIP_REDRAW_TICKS = 3;
		private int SkippedRedrawTicks = 0;

		private int WaterState;

		public override int Type { get { return TileType.WATER; } }
		public override bool IsStatic { get { return false; } }

		public Water(float x, float y)
			: base(x, y, true)
		{
			WaterState = GetWaterState();
		}

		private int GetWaterState()
		{
			int Generated = GetArbitraryAnimationFrame();
			return Generated != WaterState ? Generated : GetWaterState();
		}

		public override void Update()
		{
			if (SkippedRedrawTicks++ > SKIP_REDRAW_TICKS)
			{
				SkippedRedrawTicks = 0;
				WaterState = GetWaterState();
			}
		}

		public override void Render(GBitmap screen)
		{
			screen.Blit(Art.GRAPHICS[WaterState, 5], iX, iY);
		}
	}
}