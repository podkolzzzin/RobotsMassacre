using Level;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

namespace Level
{
	public class LevelManager
	{
		private const string DefaultLevelName = "default.rmm";

		public string GetDirByMode(Modes mode)
		{
			string p = "levels/";
			if (mode == Modes.Deathmatch) p += "dm";
			if (mode == Modes.TeamDeathmatch) p += "tdm";
			if (mode == Modes.CaptureFlag) p += "ctf";
			return p;
		}

		public int GetLevelsAmount(Modes mode)
		{
			return GetLevelFiles(mode).Length;
		}

		public int GetArbitraryLevelIndex(Modes mode)
		{
			return Program.Rand.Next(0, GetLevelsAmount(mode));
		}

		public string GetLevelName(Modes mode, int num)
		{
			return GetLevelFiles(mode)[num];
		}

		public BinaryReader GetLevelStream(Modes mode, int num)
		{
			FileStream fs = new FileStream(GetLevelName(mode, num), FileMode.Open, FileAccess.Read);
			return new BinaryReader(fs);
		}

		public string ParseName(Modes mode, string fullName)
		{
			return Path.GetFileNameWithoutExtension(fullName);
		}

		private string[] GetLevelFiles(Modes mode)
		{
			string dir = GetDirByMode(mode);
			Directory.CreateDirectory(dir);

			string[] files = Directory.GetFiles(dir);
			if (files.Length == 0)
			{
				CreateDefaultLevel(Path.Combine(dir, DefaultLevelName), mode);
				files = Directory.GetFiles(dir);
			}

			return files;
		}

		private void CreateDefaultLevel(string fileName, Modes mode)
		{
			const int width = 32;
			const int height = 24;

			using (BinaryWriter writer = new BinaryWriter(File.Open(fileName, FileMode.Create, FileAccess.Write)))
			{
				writer.Write(width);
				writer.Write(height);

				for (int x = 0; x < width; ++x)
				{
					for (int y = 0; y < height; ++y)
					{
						writer.Write((byte)GetDefaultTile(mode, x, y, width, height));
					}
				}
			}
		}

		private MapEntity GetDefaultTile(Modes mode, int x, int y, int width, int height)
		{
			if (x == 1 && y == 1) return MapEntity.RedSpawnerOnGrass;
			if (x == width - 2 && y == height - 2) return MapEntity.BluSpawnerOnGrass;

			if (mode == Modes.CaptureFlag)
			{
				if (x == 3 && y == 3) return MapEntity.RedFlagOnGrass;
				if (x == width - 4 && y == height - 4) return MapEntity.BluFlagOnGrass;
			}

			if (x == 0 || y == 0 || x == width - 1 || y == height - 1)
			{
				return MapEntity.WallOnGrass;
			}

			return MapEntity.Grass;
		}
	}
}
