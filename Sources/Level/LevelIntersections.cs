using Entity;
using Entity.Particle.Bonus;
using Entity.Tile;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Level
{
	public partial class GameLevel
	{
		public static List<Player> GetIntersectingPlayers(GEntity Entity, int IntType)
		{
			List<Player> IntersectingPlayers = new List<Player>();
			foreach (Player tPlayer in Players)
			{
				if (tPlayer == null) continue;
				if ((IntType == IntersectionType.NOT_DETECTED
					|| (IntType == IntersectionType.BY_ID && Entity.Id != tPlayer.Id)
					|| (IntType == IntersectionType.BY_DIFF_OWNER && Entity.Owner != tPlayer.Id)
					|| (IntType == IntersectionType.BY_EQUAL_OWNER && Entity.Owner == tPlayer.Id))
					&& tPlayer.IntersectsWith(Entity))
				{
					IntersectingPlayers.Add(tPlayer);
				}
			}
			return IntersectingPlayers;
		}

		public static List<Player> GetIntersectingPlayers(GEntity Entity)
		{
			return GetIntersectingPlayers(Entity, IntersectionType.NOT_DETECTED);
		}

		public static List<GEntity> GetIntersectingTiles(GEntity Entity)
		{
			List<GEntity> IntersectingTiles = new List<GEntity>();

			foreach (GEntity T in Tiles)
			{
				if (T.IntersectsWith(Entity))
				{
					IntersectingTiles.Add(T);
				}
			}

			return IntersectingTiles;
		}

		public static List<GEntity> GetIntersectingEntities(GEntity Entity, int IntType)
		{
			List<GEntity> IntersectingEntities = new List<GEntity>();

			foreach (GEntity E in Entities)
			{
				if ((IntType == IntersectionType.NOT_DETECTED
					|| (IntType == IntersectionType.BY_DIFF_OWNER && Entity.Owner != E.Id))
					&& E.IntersectsWith(Entity)
					&& !E.CanPass)
				{
					IntersectingEntities.Add(E);
				}
			}

			return IntersectingEntities;
		}

		public static List<GEntity> GetIntersectingEntities(GEntity Entity)
		{
			return GetIntersectingEntities(Entity, IntersectionType.NOT_DETECTED);
		}

		public static List<GEntity> GetNonDraggableIntersectingEntities(GEntity Entity)
		{
			List<GEntity> IntersectingEntities = GetIntersectingEntities(Entity, IntersectionType.BY_DIFF_OWNER);

			for (int i = 0; i < IntersectingEntities.Count; ++i)
			{
				if (IntersectingEntities[i].Draggable) IntersectingEntities.RemoveAt(i);
			}

			return IntersectingEntities;
		}

		public static List<Bullet> GetIntersectingBullets(GEntity Entity)
		{
			List<Bullet> IntersectingBullets = new List<Bullet>();

			foreach (Bullet B in Bullets)
			{
				if (Entity.Owner != B.Owner && B.IntersectsWith(Entity))
				{
					IntersectingBullets.Add(B);
				}
			}

			return IntersectingBullets;
		}

		public static List<Bonus> GetIntersectingBonuses(GEntity Entity)
		{
			List<Bonus> IntersectingBonuses = new List<Bonus>();

			foreach (KeyValuePair<int, Bonus> B in Bonuses)
			{
				if (B.Value.IntersectsWith(Entity))
				{
					IntersectingBonuses.Add(B.Value);
				}
			}

			return IntersectingBonuses;
		}

		public static GEntity GetTile(int xt, int yt)
		{
			GEntity tT = new GEntity(xt * GTile.WIDTH, yt * GTile.HEIGHT, 30, 30);
			GEntity Found = new GEntity(0, 0, 0, 0);

			foreach (GEntity T in Tiles)
			{
				if (T.IntersectsWith(tT))
				{
					Found = T;
				}
			}

			return Found;
		}
	}
}