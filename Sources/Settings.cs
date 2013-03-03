using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Xml;
using System.Xml.Serialization;

namespace Robots_Massacre_Client
{
	[Serializable]
	public class OptionList
	{
		public int ScreenWidth = 640;
		public int ScreenHeight = 480;
		public string Name = "Tanker";

		public int StatsKills = 0;
		public int StatsDeaths = 0;
		public long StatsTimePlayed = 0;
		public int StatsGamesPlayed = 0;
		public int IntStatsShots = 0;
		public int IntStatsHits = 0;
		public double StatsAccuracy = 0.0;
	}

	public class Settings
	{
		private const string SETTINGS_FILE = "data/settings.xml";

		private OptionList Downfaulted = new OptionList();
		public OptionList List = new OptionList();

		public Settings() { }

		private void Precompute()
		{
			if (List.IntStatsShots > 0)
			{
				List.StatsAccuracy = (double)List.IntStatsHits / (double)List.IntStatsShots;
			}
		}

		public void Reset()
		{
			List = Downfaulted;
		}

		public void Load()
		{
			FileStream fs = new FileStream(SETTINGS_FILE, FileMode.OpenOrCreate, FileAccess.Read);

			if (fs.Length > 0)
			{
				XmlSerializer serializer = new XmlSerializer(typeof(OptionList));
				List = (OptionList)serializer.Deserialize(fs);
			}

			fs.Close();
		}

		public void Save()
		{
			Precompute();

			FileStream fs = new FileStream(SETTINGS_FILE, FileMode.OpenOrCreate, FileAccess.Write);
			XmlSerializer serializer = new XmlSerializer(typeof(OptionList));
			serializer.Serialize(fs, List);
			fs.Close();
		}
	}
}