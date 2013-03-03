using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using Level;
using System.IO;

namespace MapEditing
{
    class MapWarehouse
    {
        private static string Address = "http://lugbasket.org.ua/nonLBfiles/RobotsMassacre/";
        public static void AddMap(string fileName, Modes mapMode)
        {
            WebClient wc = new WebClient();
            FileInfo f = new FileInfo("levels\\" + fileName);
            string name = f.Name.Substring(0, f.Name.IndexOf(f.Extension));
            string str = Encoding.UTF8.GetString(wc.UploadFile(Address + "addMap.php?name=" + name + "&mode=" + (int)mapMode, "POST", "levels\\" + fileName));
        }

        public static List<KeyValuePair<string, BinaryReader>> Get(Modes mode, int offset = 0, int count = 10)
        {
            WebClient wc = new WebClient();
            List<KeyValuePair<string, BinaryReader>> result = new List<KeyValuePair<string, BinaryReader>>();
            string[] names = wc.DownloadString(Address + "getMapNames.php?mode=" + (int)mode + "&position=" + offset + "&count=" + count).Split('\n');
            byte[] data;
            MemoryStream tStream;
            for (int i = 0; i < names.Length - 1; i++)
            {
                if (names[i].Length > 0)
                {
                    data=wc.DownloadData(Address + "getMap.php?mode=" + (int)mode + "&position=" + (offset + i));
                    tStream=new MemoryStream(data);
                    result.Add(new KeyValuePair<string, BinaryReader>(names[i],
                        new BinaryReader(tStream)));
                }
            }
            return result;
        }

        public static void Save(int position,Modes mode)
        {
            try
            {
                var t = Get(mode, position, 1)[0];
                string name = "levels\\";
                if (mode == Modes.CaptureFlag)
                    name += "ctf\\";
                else if (mode == Modes.Deathmatch)
                    name += "dm\\";
                else
                    name += "tdm\\";

                name += t.Key + ".rmm";
                byte[] buffer = new byte[t.Value.BaseStream.Length];
                t.Value.Read(buffer, 0, (int)t.Value.BaseStream.Length);
                File.WriteAllBytes(name, buffer);
            }
            catch (ArgumentOutOfRangeException) { }
        }
    }
}
