using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity.Tile
{
	public class TileType
	{
		public const int WALL = 1;
		public const int METAL = 2;
		public const int SAND = 3;
		public const int WATER = 4;
		public const int GRAVEL = 5;
		public const int GRASS = 6;
		public const int D_FLOWER = 7;
		public const int D_GRASS_SHORE = 8;
		public const int D_GRAVEL_SHORE = 9;
		public const int D_SAND_SHORE = 10;
		public const int D_SAND_TRACE = 11;
	}

	public class GTile : GEntity
	{
		public static readonly int WIDTH = 30;
		public static readonly int HEIGHT = 30;

		public override bool IsStatic { get { return true; } }

		public GTile(float x, float y, int hp) : base(x, y, WIDTH, HEIGHT, hp, hp) { }

		public GTile(float x, float y, bool immortal) : base(x, y, WIDTH, HEIGHT, immortal) { }
	}
}