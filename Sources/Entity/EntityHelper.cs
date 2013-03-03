using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Entity
{
	public partial class GEntity
	{
		public static Directions GetOppositeDirection(Directions Dir)
		{
			Directions R = 0;
			if (Dir == Directions.Left) R = Directions.Right;
			if (Dir == Directions.Right) R = Directions.Left;
			if (Dir == Directions.Up) R = Directions.Down;
			if (Dir == Directions.Down) R = Directions.Up;
			return R;
		}

		public static int GetArbitraryAnimationFrame()
		{
			int AnimFrame = 0;
			int Generated = Program.Rand.Next(0, 128);
			if (Generated < 64) AnimFrame = 0;
			else if (Generated % 2 == 0) AnimFrame = 1;
			else if (Generated % 2 != 0) AnimFrame = 2;
			return AnimFrame;
		}

		public static double GetTwoPointsDist(float x1, float x2, float y1, float y2)
		{
			return Math.Sqrt(Math.Pow(x1 - x2, 2.0) + Math.Pow(y1 - y2, 2.0));
		}

		public static bool RectangleIntersectsWithCircle(int rx, int ry, int rw, int rh, int cx, int cy, int cr)
		{
			return GetTwoPointsDist(rx, cx, ry, cy) <= cr || GetTwoPointsDist(rx + rw, cx, ry, cy) <= cr ||
				GetTwoPointsDist(rx, cx, ry + rh, cy) <= cr || GetTwoPointsDist(rx + rw, cx, ry + rh, cy) <= cr;
		}
	}
}