using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Entity;
using Entity.Tile;
using Entity.Details;
using Level;

namespace Network
{
	class BinaryHelper
	{
		//===============PUT functions
		public static void Write(int value, ref int pos, ref byte[] arr)
		{
			var temp = BitConverter.GetBytes(value);
			temp.CopyTo(arr, pos);
			pos += sizeof(int);
		}
		public static void Write(byte value, ref int pos, ref byte[] arr)
		{
			arr[pos] = value;
			pos++;
		}
		public static void Write(float value, ref int pos, ref byte[] arr)
		{
			var temp = BitConverter.GetBytes(value);
			temp.CopyTo(arr, pos);
			pos += sizeof(float);
		}
		public static void Write(long value, ref int pos, ref byte[] arr)
		{
			var temp = BitConverter.GetBytes(value);
			temp.CopyTo(arr, pos);
			pos += sizeof(long);
		}
		public static void Write(bool value, ref int pos, ref byte[] arr)
		{
			var temp = BitConverter.GetBytes(value);
			temp.CopyTo(arr, pos);
			pos += sizeof(bool);
		}
		public static void Write(Directions value, ref int pos, ref byte[] arr)
		{
			Write((int)value, ref pos, ref arr);
		}
		//===============Take functions
		public static int ReadInt32(byte[] arr, ref int pos)
		{
			pos += 4;
			return BitConverter.ToInt32(arr, pos - 4);
		}
		public static float ReadFloat(byte[] arr, ref int pos)
		{
			pos += 4;
			return BitConverter.ToSingle(arr, pos - 4);
		}
		public static long ReadLong(byte[] arr, ref int pos)
		{
			pos += sizeof(long);
			return BitConverter.ToInt64(arr, pos - sizeof(long));
		}

		public static bool ReadBool(byte[] arr, ref int pos)
		{
			pos += sizeof(bool);
			return BitConverter.ToBoolean(arr, pos - sizeof(bool));
		}

		internal static byte ReadByte(byte[] data, ref int pos)
		{
			pos++;
			return data[pos - 1];
		}

		//===save function
		private const int TILE_SIZE = sizeof(float) + sizeof(float) + sizeof(int) * 4;
		private const int ENTITY_SIZE = sizeof(float) * 2 + sizeof(int) + sizeof(int) + sizeof(int);
		private const int SPAWNER_SIZE = sizeof(float) * 2 + sizeof(int) + sizeof(int);
		private static void _write(GTile tile, ref int pos, byte[] arr)
		{
			Write(tile.X, ref pos, ref arr);
			Write(tile.Y, ref pos, ref arr);
			Write(tile.Type, ref pos, ref arr);
			Write(tile.Direction, ref pos, ref arr);
		}

		private static void _write(GEntity entity, ref int pos, byte[] arr)
		{
			Write(entity.X, ref pos, ref arr);
			Write(entity.Y, ref pos, ref arr);
			Write(entity.Type, ref pos, ref arr);
			if (entity.Type == EntityType.MINE)
				Write(Convert.ToInt32(((Mine)entity).Countdown), ref pos, ref arr);
			else
				Write(entity.Health, ref pos, ref arr);
			Write(entity.Owner, ref pos, ref arr);
			Write(entity.Direction, ref pos, ref arr);
		}

		private static void _write(Spawner spawner, ref int pos, byte[] arr)
		{
			Write(spawner.X, ref pos, ref arr);
			Write(spawner.Y, ref pos, ref arr);
			Write((int)spawner.Team, ref pos, ref arr);
			Write(spawner.Type, ref pos, ref arr);
		}

		private static GTile _readTile(byte[] arr, ref int pos)
		{
			GTile Tile = null;
			float x = ReadFloat(arr, ref pos);
			float y = ReadFloat(arr, ref pos);
			int type = ReadInt32(arr, ref pos);
			Directions dir = (Directions)ReadInt32(arr, ref pos);

			if (type == TileType.GRASS) Tile = new Grass(x, y);
			if (type == TileType.GRAVEL) Tile = new Gravel(x, y);
			if (type == TileType.METAL) Tile = new Metal(x, y);
			if (type == TileType.SAND) Tile = new Sand(x, y);
			if (type == TileType.WATER) Tile = new Water(x, y);
			if (type == TileType.D_FLOWER) Tile = new Flower(x, y);
			if (type == TileType.D_GRASS_SHORE) Tile = new GrassShore(x, y, dir);
			if (type == TileType.D_GRAVEL_SHORE) Tile = new GravelShore(x, y, dir);
			if (type == TileType.D_SAND_SHORE) Tile = new SandShore(x, y, dir);
			if (type == TileType.D_SAND_TRACE) Tile = new SandTrace(x, y, dir);
			if (type == 0) Tile = new GTile(x, y, true);

			return Tile;
		}

		private static GEntity _readEntity(byte[] arr, ref int pos)
		{
			GEntity Entity = null;
			int x = (int)ReadFloat(arr, ref pos);
			int y = (int)ReadFloat(arr, ref pos);
			int type = ReadInt32(arr, ref pos);
			int health = ReadInt32(arr, ref pos);
			int owner = ReadInt32(arr, ref pos);
			Directions dir = (Directions)ReadInt32(arr, ref pos);


			if (type == TileType.WALL) Entity = new Wall(x, y, health);
			else if (type == TileType.METAL) Entity = new Metal(x, y);
			else
			{
				if (type == EntityType.TURRET) Entity = new Turret(owner, x, y, health);
				if (type == EntityType.MINE) Entity = new Mine(owner, x, y, health > 0);
				if (type == EntityType.DISPENSER) Entity = new Dispenser(owner, x, y, health);
			}

			return Entity;
		}

		private static Spawner _readSpawner(byte[] arr, ref int pos)
		{
			float x = ReadFloat(arr, ref pos);
			float y = ReadFloat(arr, ref pos);
			int team = ReadInt32(arr, ref pos);
			int type = ReadInt32(arr, ref pos);
			return new Spawner(x, y, (Teams)team);
		}

		public static byte[] SaveGameState(List<GEntity>[] elems, int lWidth, int lHeight)
		{
			int length = 2 * sizeof(int) + TILE_SIZE * elems[0].Count + ENTITY_SIZE * elems[1].Count + SPAWNER_SIZE * elems[2].Count;
			byte[] data = new byte[length];
			int pos = 0;

			Write(lWidth, ref pos, ref data);
			Write(lHeight, ref pos, ref data);

			Write(elems[0].Count, ref pos, ref data);
			foreach (GTile item in elems[0])
				_write(item, ref pos, data);

			Write(elems[1].Count, ref pos, ref data);
			foreach (GEntity item in elems[1])
				_write(item, ref pos, data);

			Write(elems[2].Count, ref pos, ref data);
			foreach (Spawner item in elems[2])
				_write(item, ref pos, data);

			return data;
		}

		public static new object[] LoadGameState(byte[] data)
		{
			int pos = 0;

			int lWidth = ReadInt32(data, ref pos);
			int lHeight = ReadInt32(data, ref pos);

			int n = ReadInt32(data, ref pos);
			List<GEntity> tiles = new List<GEntity>();
			for (int i = 0; i < n; i++) tiles.Add(_readTile(data, ref pos));

			n = ReadInt32(data, ref pos);
			List<GEntity> entities = new List<GEntity>();
			for (int i = 0; i < n; i++) entities.Add(_readEntity(data, ref pos));

			n = ReadInt32(data, ref pos);
			List<GEntity> spawners = new List<GEntity>();
			for (int i = 0; i < n; i++) spawners.Add(_readSpawner(data, ref pos));

			return new object[] { lWidth, lHeight, tiles, entities, spawners };
		}
	}
}