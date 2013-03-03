using Entity;
using Entity.Particle;
using Entity.Particle.Bonus;
using Entity.Tile;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Level
{
	public partial class GameLevel
	{
		private Dictionary<int, Bonus> Client_GetBonuses()
		{
			return Bonuses;
		}

		private void Client_OnBonusRemoved(int bonusId)
		{
			Bonuses.Remove(bonusId);
		}

		private void Client_AddPlayerComplete() { }

		private void Client_AddPlayerProgress(double progress)
		{
			ConnectionProgress = progress;
		}

		private int Client_GetGameMode()
		{
			return (int)Mode;
		}

		private List<GEntity>[] Client_GetGameState()
		{
			return new List<GEntity>[] { Tiles, Entities, Spawners };
		}

		public static void SetLevel(int level)
		{
			Level = level;
		}

		public static Modes GetMode()
		{
			return Mode;
		}

		public static void SetMode(Modes mode)
		{
			Mode = mode;
		}

		public static int GetBonusId()
		{
			return ++BonusId;
		}

		public static int GetTurretId()
		{
			return --TurretId;
		}

		public static void AddTile(GEntity Tile)
		{
			Tiles.Add(Tile);
		}

		public static void AddEntity(GEntity Entity)
		{
			lock (Entities)
			{
				Entities.Add(Entity);
			}
		}

		public static void AddSpawner(GEntity Spawner)
		{
			Spawners.Add(Spawner);
		}

		public static void AddBullet(Bullet B)
		{
			Bullets.Add(B);
		}

		public static void AddParticle(Particle P)
		{
			Particles.Add(P);
		}

		public static void AddBonus(Bonus B)
		{
			Bonuses.Add(B.Id, B);
			Client.OnBonusAdd(B);
		}

		public static bool CreateEntity(GEntity Entity)
		{
			return CreateEntity(Entity, CurrentPlayerId);
		}

		public Player GetPrevPlayer(int id)
		{
			return id - 1 > 0 ? (GetPlayer(id - 1) != null ? GetPlayer(id - 1) : GetPlayer(id - 2)) : GetPrevPlayer(GetPlayers().Count);
		}

		public static Player GetPlayer(int Id)
		{
			return Players[Id];
		}

		public static List<Player> GetPlayers()
		{
			return Players;
		}

		private int[] GetFutureBonusTiles()
		{
			++BonusGenerationAttempts;

			if (BonusGenerationAttempts > 10)
			{
				return new int[] { 0, 0 };
			}

			int FutureXt = Program.Rand.Next(CurrentLevelWidth);
			int FutureYt = Program.Rand.Next(CurrentLevelHeight);

			GEntity FutureBonusPlace = new GEntity(FutureXt * GTile.WIDTH, FutureYt * GTile.HEIGHT, 30, 30);
			GEntity Tile = GetTile(FutureXt, FutureYt);

			int ie = GetIntersectingEntities(FutureBonusPlace).Count;
			int ip = GetIntersectingPlayers(FutureBonusPlace).Count;
			int ib = GetIntersectingBonuses(FutureBonusPlace).Count;

			if (Tile != null && Tile.CanPass && ie == 0 && ib == 0 && ip == 0)
			{
				BonusGenerationAttempts = 0;
				return new int[] { FutureXt, FutureYt };
			}
			else return GetFutureBonusTiles();
		}

		public static int[] GetNewEntityOffsets(int id = -1)
		{
			if (id == -1) id = CurrentPlayerId;
			Directions Dir = Players[id].Direction;

			int xt = (int)Math.Floor((Players[id].X) / GTile.WIDTH * 3);
			int yt = (int)Math.Floor((Players[id].Y) / GTile.HEIGHT * 3);
			int xtDiff = (int)Players[id].X - xt * GTile.WIDTH / 3;
			int ytDiff = (int)Players[id].Y - yt * GTile.HEIGHT / 3;

			int xo = 0;
			int yo = 0;

			if (Dir == Directions.Up) yo = -30;
			if (Dir == Directions.Right) xo = 30;
			if (Dir == Directions.Down) yo = 30;
			if (Dir == Directions.Left) xo = -30;

			if (Dir == Directions.Up || Dir == Directions.Down)
			{
				yt = (int)Math.Round((Players[id].Y + yo) / GTile.HEIGHT * 3);
				ytDiff = (int)Players[id].Y + yo - yt * GTile.HEIGHT / 3;

				xo -= xtDiff;
				yo -= ytDiff - 1;
			}
			else
			{
				xt = (int)Math.Round((Players[id].X + xo) / GTile.WIDTH * 3);
				xtDiff = (int)Players[id].X + xo - xt * GTile.WIDTH / 3;

				xo -= xtDiff;
				yo -= ytDiff;
			}

			return new int[] { xo, yo };
		}

		public static List<GEntity> GetSpawners(Teams team)
		{
			if (team == Teams.NoTeam) return Spawners;

			List<GEntity> TeamSpawners = new List<GEntity>();
			foreach (GEntity spawner in Spawners)
			{
				if (spawner.Team == team)
				{
					TeamSpawners.Add(spawner);
				}
			}
			return TeamSpawners;
		}

		public static GEntity GetFlag(Teams team)
		{
			foreach (GEntity entity in Entities)
			{
				if (entity.Type == EntityType.FLAG && (entity.Team == team || team == Teams.NoTeam))
				{
					return entity;
				}
			}
			return null;
		}
	}
}