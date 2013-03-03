using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity;
using Entity.Details;
using Entity.Tile;
using System.IO;
using Robots_Massacre_Client;
using Gfx;

namespace Level
{
	public enum MapEntity : byte
	{
		WallOnGravel = 1,
		WallOnWater = 2,
		WallOnSand = 3,
		WallOnGrass = 20,

		Metal = 4,

		Gravel = 5,
		Sand = 6,
		Grass = 7,
		Water = 11,

		RedSpawnerOnGravel = 8,
		RedSpawnerOnSand = 9,
		RedSpawnerOnWater = 10,
		RedSpawnerOnGrass = 21,

		BluSpawnerOnGravel = 25,
		BluSpawnerOnSand = 12,
		BluSpawnerOnWater = 13,
		BluSpawnerOnGrass = 22,

		RedFlagOnGravel = 14,
		RedFlagOnSand = 15,
		RedFlagOnWater = 16,
		RedFlagOnGrass = 23,

		BluFlagOnGravel = 17,
		BluFlagOnSand = 18,
		BluFlagOnWater = 19,
		BluFlagOnGrass = 24
	}

	public static class LevelGen
	{
        public static object[] ParseLevel(string name)
        {
            BinaryReader br=new BinaryReader(File.OpenRead(name));
            var t = _parseLevel(br);
            br.Close();
            return t;
        }

		public static object[] ParseLevel(int Level)
		{
			LevelManager manager = new LevelManager();
			BinaryReader br = manager.GetLevelStream(GameLevel.GetMode(), Level);
            var t =  _parseLevel(br);
            br.Close();
            return t;
		}

        private static object[] _parseLevel(BinaryReader br)
        {
            List<GEntity> ParsedTiles = new List<GEntity>();
            List<GEntity> ParsedEntities = new List<GEntity>();
            List<GEntity> ParsedSpawners = new List<GEntity>();
            int TileWidth = GTile.WIDTH;
            int TileHeight = GTile.HEIGHT;

            int Cx = 0;
            int Cy = 0;


            int width = br.ReadInt32();
            int height = br.ReadInt32();

            MapEntity mp;

            GEntity tTile = null;
            GEntity tEntity = null;
            GEntity tSpawner = null;

            for (int x = 0; x < width; ++x)
            {
                for (int y = 0; y < height; ++y)
                {
                    Cx = x * TileWidth;
                    Cy = y * TileHeight;

                    tTile = null;
                    tEntity = null;
                    tSpawner = null;

                    mp = (MapEntity)br.ReadByte();
                    switch (mp)
                    {
                        case MapEntity.WallOnGravel:
                            tTile = new Gravel(Cx, Cy);
                            tEntity = new Wall(Cx, Cy);
                            break;
                        case MapEntity.WallOnWater:
                            tTile = new Water(Cx, Cy);
                            tEntity = new Wall(Cx, Cy);
                            break;
                        case MapEntity.WallOnSand:
                            tTile = new Sand(Cx, Cy);
                            tEntity = new Wall(Cx, Cy);
                            break;
                        case MapEntity.WallOnGrass:
                            tTile = new Grass(Cx, Cy);
                            tEntity = new Wall(Cx, Cy);
                            break;

                        case MapEntity.Metal:
                            tTile = new GTile(Cx, Cy, true);
                            tEntity = new Metal(Cx, Cy);
                            break;

                        case MapEntity.Water:
                            tTile = new Water(Cx, Cy);
                            break;
                        case MapEntity.Gravel:
                            tTile = new Gravel(Cx, Cy);
                            break;
                        case MapEntity.Sand:
                            tTile = new Sand(Cx, Cy);
                            break;
                        case MapEntity.Grass:
                            tTile = new Grass(Cx, Cy);
                            break;

                        case MapEntity.RedSpawnerOnGravel:
                            tTile = new Gravel(Cx, Cy);
                            tSpawner = new Spawner(Cx, Cy, Teams.Red);
                            break;
                        case MapEntity.RedSpawnerOnWater:
                            tTile = new Water(Cx, Cy);
                            tSpawner = new Spawner(Cx, Cy, Teams.Red);
                            break;
                        case MapEntity.RedSpawnerOnSand:
                            tTile = new Sand(Cx, Cy);
                            tSpawner = new Spawner(Cx, Cy, Teams.Red);
                            break;
                        case MapEntity.RedSpawnerOnGrass:
                            tTile = new Grass(Cx, Cy);
                            tSpawner = new Spawner(Cx, Cy, Teams.Red);
                            break;

                        case MapEntity.BluSpawnerOnGravel:
                            tTile = new Gravel(Cx, Cy);
                            tSpawner = new Spawner(Cx, Cy, Teams.Blu);
                            break;
                        case MapEntity.BluSpawnerOnWater:
                            tTile = new Water(Cx, Cy);
                            tSpawner = new Spawner(Cx, Cy, Teams.Blu);
                            break;
                        case MapEntity.BluSpawnerOnSand:
                            tTile = new Sand(Cx, Cy);
                            tSpawner = new Spawner(Cx, Cy, Teams.Blu);
                            break;
                        case MapEntity.BluSpawnerOnGrass:
                            tTile = new Grass(Cx, Cy);
                            tSpawner = new Spawner(Cx, Cy, Teams.Blu);
                            break;

                        case MapEntity.BluFlagOnGravel:
                            tTile = new Gravel(Cx, Cy);
                            tEntity = new Flag(Cx, Cy, Teams.Blu);
                            break;
                        case MapEntity.BluFlagOnWater:
                            tTile = new Water(Cx, Cy);
                            tEntity = new Flag(Cx, Cy, Teams.Blu);
                            break;
                        case MapEntity.BluFlagOnSand:
                            tTile = new Sand(Cx, Cy);
                            tEntity = new Flag(Cx, Cy, Teams.Blu);
                            break;
                        case MapEntity.BluFlagOnGrass:
                            tTile = new Grass(Cx, Cy);
                            tEntity = new Flag(Cx, Cy, Teams.Blu);
                            break;

                        case MapEntity.RedFlagOnGravel:
                            tTile = new Gravel(Cx, Cy);
                            tEntity = new Flag(Cx, Cy, Teams.Red);
                            break;
                        case MapEntity.RedFlagOnWater:
                            tTile = new Water(Cx, Cy);
                            tEntity = new Flag(Cx, Cy, Teams.Red);
                            break;
                        case MapEntity.RedFlagOnSand:
                            tTile = new Sand(Cx, Cy);
                            tEntity = new Flag(Cx, Cy, Teams.Red);
                            break;
                        case MapEntity.RedFlagOnGrass:
                            tTile = new Grass(Cx, Cy);
                            tEntity = new Flag(Cx, Cy, Teams.Red);
                            break;
                    }

                    if (tTile != null) ParsedTiles.Add(tTile);
                    if (tEntity != null) ParsedEntities.Add(tEntity);
                    if (tSpawner != null) ParsedSpawners.Add(tSpawner);
                }
            }

            return new object[] { width, height, ParsedTiles, ParsedEntities, ParsedSpawners };       
        }

		public static List<GEntity> GetLevelDetails(List<GEntity> Tiles)
		{
			List<GEntity> Details = new List<GEntity>();

			int xt, yt;
			int NxLeft, NyLeft, NxRight, NyRight, NxUp, NyUp, NxDown, NyDown;
			GEntity LeftTile, RightTile, UpTile, DownTile;

			foreach (GEntity T in Tiles)
			{
				xt = T.iX / GTile.WIDTH;
				yt = T.iY / GTile.HEIGHT;

				NxLeft = T.iX - GTile.WIDTH + 2;
				NyLeft = T.iY;
				NxRight = T.iX + GTile.WIDTH - 2;
				NyRight = T.iY;
				NxUp = T.iX;
				NyUp = T.iY - GTile.HEIGHT + 2;
				NxDown = T.iX;
				NyDown = T.iY + GTile.HEIGHT - 2;

				LeftTile = GameLevel.GetTile(xt - 1, yt);
				RightTile = GameLevel.GetTile(xt + 1, yt);
				UpTile = GameLevel.GetTile(xt, yt - 1);
				DownTile = GameLevel.GetTile(xt, yt + 1);

				if (T.Type == TileType.SAND)
				{
					if (Sand.IsTraceAcceptable(LeftTile)) Details.Add(new SandTrace(NxLeft, NyLeft, Directions.Left));
					if (Sand.IsTraceAcceptable(RightTile)) Details.Add(new SandTrace(NxRight, NyRight, Directions.Right));
					if (Sand.IsTraceAcceptable(UpTile)) Details.Add(new SandTrace(NxUp, NyUp, Directions.Up));
					if (Sand.IsTraceAcceptable(DownTile)) Details.Add(new SandTrace(NxDown, NyDown, Directions.Down));

					if (Sand.IsShoreAcceptable(LeftTile)) Details.Add(new SandShore(NxLeft, NyLeft, Directions.Left));
					if (Sand.IsShoreAcceptable(RightTile)) Details.Add(new SandShore(NxRight, NyRight, Directions.Right));
					if (Sand.IsShoreAcceptable(UpTile)) Details.Add(new SandShore(NxUp, NyUp, Directions.Up));
					if (Sand.IsShoreAcceptable(DownTile)) Details.Add(new SandShore(NxDown, NyDown, Directions.Down));
				}

				if (T.Type == TileType.GRAVEL)
				{
					if (Gravel.IsShoreAcceptable(LeftTile)) Details.Add(new GravelShore(NxLeft, NyLeft, Directions.Left));
					if (Gravel.IsShoreAcceptable(RightTile)) Details.Add(new GravelShore(NxRight, NyRight, Directions.Right));
					if (Gravel.IsShoreAcceptable(UpTile)) Details.Add(new GravelShore(NxUp, NyUp, Directions.Up));
					if (Gravel.IsShoreAcceptable(DownTile)) Details.Add(new GravelShore(NxDown, NyDown, Directions.Down));
				}

				if (T.Type == TileType.GRASS)
				{
					if (Grass.IsShoreAcceptable(LeftTile)) Details.Add(new GrassShore(NxLeft, NyLeft, Directions.Left));
					if (Grass.IsShoreAcceptable(RightTile)) Details.Add(new GrassShore(NxRight, NyRight + 1, Directions.Right));
					if (Grass.IsShoreAcceptable(UpTile)) Details.Add(new GrassShore(NxUp, NyUp, Directions.Up));
					if (Grass.IsShoreAcceptable(DownTile)) Details.Add(new GrassShore(NxDown, NyDown, Directions.Down));

					if (Program.Rand.Next(128) < 48)
					{
						Details.Add(new Flower((int)T.X + Program.Rand.Next(30 - Flower.WIDTH), (int)T.Y + Program.Rand.Next(30 - Flower.HEIGHT)));
					}
				}
			}

			return Details;
		}

		public static GBitmap CreateThumbnail(BinaryReader reader)
		{
			int w = reader.ReadInt32();
			int h = reader.ReadInt32();
			int a = 255;

			GBitmap bitmap = new GBitmap(w, h);

			for (int x = 0; x < w; ++x)
			{
				for (int y = 0; y < h; ++y)
				{
					MapEntity type = (MapEntity)reader.ReadByte();
					Color col = Color.FromArgb(255, 0, 0, 0);

					if (type == MapEntity.WallOnGravel) col = Color.FromArgb(a, 255, 0, 0);
					if (type == MapEntity.WallOnWater) col = Color.FromArgb(a, 255, 137, 137);
					if (type == MapEntity.WallOnSand) col = Color.FromArgb(a, 141, 0, 0);
					if (type == MapEntity.WallOnGrass) col = Color.FromArgb(a, 124, 21, 21);
					if (type == MapEntity.Water) col = Color.FromArgb(a, 0, 0, 255);
					if (type == MapEntity.Sand) col = Color.FromArgb(a, 100, 100, 100);
					if (type == MapEntity.Gravel) col = Color.FromArgb(a, 150, 150, 150);
					if (type == MapEntity.Grass) col = Color.FromArgb(a, 200, 0, 200);
					if (type == MapEntity.Metal) col = Color.FromArgb(a, 0, 150, 150);
					if (type == MapEntity.RedSpawnerOnGravel) col = Color.FromArgb(a, 0, 255, 0);
					if (type == MapEntity.RedSpawnerOnGrass) col = Color.FromArgb(a, 163, 159, 163);
					if (type == MapEntity.RedSpawnerOnSand) col = Color.FromArgb(a, 0, 93, 0);
					if (type == MapEntity.RedSpawnerOnWater) col = Color.FromArgb(a, 193, 255, 193);
					if (type == MapEntity.BluSpawnerOnGravel) col = Color.FromArgb(a, 157, 255, 157);
					if (type == MapEntity.BluSpawnerOnGrass) col = Color.FromArgb(a, 183, 126, 183);
					if (type == MapEntity.BluSpawnerOnSand) col = Color.FromArgb(a, 46, 96, 46);
					if (type == MapEntity.BluSpawnerOnWater) col = Color.FromArgb(a, 145, 188, 145);

					bitmap.SetPixel(x, y, col);
				}
			}

			return bitmap;
		}

        public static Color GetEntityColor(GEntity g)
        {
            if (typeof(Spawner) == g.GetType())
            {
                if (g.Team == Teams.Blu)
                    return Color.DarkBlue;
                else
                    return Color.FromArgb(190, 0, 0);
            }
            switch (g.Type)
            { 
                case TileType.WALL:
                    return Color.FromArgb(127, 64, 0);
                case TileType.METAL:
                    return Color.Silver;
                case TileType.GRAVEL:
                    return Color.Gray;
                case TileType.SAND:
                    return Color.Yellow;
                case TileType.GRASS:
                    return Color.LightGray;
                case TileType.WATER:
                    return Color.Blue;
            }

            if (g.Team != Teams.NoTeam)
            {
                if (typeof(Flag) == g.GetType())
                {
                    if (g.Team == Teams.Blu)
                        return Color.FromArgb(0,255,255);
                    else
                        return Color.Red;
                }
            }

            return Color.Black;
        }
	}
}