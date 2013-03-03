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
			return Directory.GetFiles(GetDirByMode(mode)).Length;
		}

		public int GetArbitraryLevelIndex(Modes mode)
		{
			return Program.Rand.Next(0, GetLevelsAmount(mode));
		}

		public string GetLevelName(Modes mode, int num)
		{
			return Directory.GetFiles(GetDirByMode(mode))[num];
		}

		public BinaryReader GetLevelStream(Modes mode, int num)
		{
			FileStream fs = new FileStream(GetLevelName(mode, num), FileMode.Open, FileAccess.Read);
			return new BinaryReader(fs);
		}

		public string ParseName(Modes mode, string fullName)
		{
			string[] parts = fullName.Split('\\');
			parts = parts[parts.Length - 1].Split('.');
			return parts[0];
		}
	}
}