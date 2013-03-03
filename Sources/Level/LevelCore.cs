using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using Robots_Massacre_Client;
using Network;
using Entity;
using Entity.Tile;
using Entity.Particle;
using Entity.Particle.Bonus;
using Gui.Components;
using Inventory;
using Entity.Details;
using Gfx;

namespace Level
{
	public class CtfScore
	{
		public int Red = 0;
		public int Blu = 0;

		public void Increment(Teams team)
		{
			if (team == Teams.Blu) ++Blu;
			else ++Red;
		}

		public int Get(Teams team)
		{
			if (team == Teams.Red) return Red;
			if (team == Teams.Blu) return Blu;
			return Red + Blu;
		}
	}

	public partial class GameLevel
	{
		public const int MAX_LEVEL_WIDTH = 80 * 30;
		public const int MAX_LEVEL_HEIGHT = 60 * 30;

		public static InputHandler Input;

		public static int CurrentPlayerId;
		public static Player CurrentPlayer
		{
			get
			{
				return GetPlayer(CurrentPlayerId);
			}
			set
			{
				CurrentPlayerId = value.Id;
			}
		}
		private static Modes Mode;
		public static CtfScore Score = new CtfScore();

		public static int CurrentLevelWidth = 0;
		public static int CurrentLevelHeight = 0;
		public static int XScroll = 0;
		public static int YScroll = 0;

		private static GBitmap Background;
		private static GBitmap Fog;
		private static GBitmap BuildingGrid;

		// Game objects
		private static List<GEntity> Tiles = new List<GEntity>();
		private static List<Player> Players = new List<Player>();
		private static List<Bullet> Bullets = new List<Bullet>();
		private static List<GEntity> Entities = new List<GEntity>();
		private static List<Particle> Particles = new List<Particle>();
		private static Dictionary<int, Bonus> Bonuses = new Dictionary<int, Bonus>();
		private static List<GEntity> Spawners = new List<GEntity>();

		private static int TurretId = 0;
		public static int BonusId = 0;
		private static int Level = 2;

		private const int SKIP_BONUSGEN_TICKS = 225;
		private int SkippedBonusGenTicks = 0;

		public static bool ShowGrid = true;

		public static GameClient Client;
		public double ConnectionProgress;

		private int BonusGenerationAttempts = 0;

		public GameLevel(InputHandler tInput, GameClient tClient)
		{
			Input = tInput;
			Client = tClient;
			Client.GetGameMode += Client_GetGameMode;
			Client.GetGameState += Client_GetGameState;
			Client.GetBonuses += Client_GetBonuses;

			if (Client.IsMain)
			{
				object[] ParsedLevel = LevelGen.ParseLevel(Level);

				CurrentLevelWidth = (int)ParsedLevel[0];
				CurrentLevelHeight = (int)ParsedLevel[1];

				Tiles = (List<GEntity>)ParsedLevel[2];
				Entities = (List<GEntity>)ParsedLevel[3];
				Spawners = (List<GEntity>)ParsedLevel[4];

				foreach (GEntity D in LevelGen.GetLevelDetails(Tiles)) Tiles.Add(D);

				GEntity S = Player.GetSpawnCoordinates(Spawners);
				Player p = new Player(0, S.X, S.Y);

				Players.Add(p);
				CurrentPlayer = p;
				Client.CurrentPlayer = p;
			}
			else
			{
				var addPlayerResult = Client.AddPlayer(Players);
				Tiles = addPlayerResult.Tiles;
				Entities = addPlayerResult.Entities;
				Spawners = addPlayerResult.Spawners;
				Bonuses = addPlayerResult.Bonuses;
				SetMode((Modes)addPlayerResult.Mode);
				CurrentLevelWidth = addPlayerResult.LevelWidth;
				CurrentLevelHeight = addPlayerResult.LevelHeight;
				CurrentPlayer = addPlayerResult.Player;
				Client.AddPlayerProgress += Client_AddPlayerProgress;
				Client.AddPlayerComplete += Client_AddPlayerComplete;
			}

			Client.OnBonusRemoved += Client_OnBonusRemoved;
			Client.Init(Entities, Players);
			CurrentPlayer.Controllable = true;
			CenterCameraOnPlayer();

			GenerateBackground();

			int lw = CurrentLevelWidth * GTile.WIDTH;
			int lh = CurrentLevelHeight * GTile.HEIGHT;
			Fog = new GBitmap(lw, lh);
			BuildingGrid = new GBitmap(lw, lh);
			UpdateBitmapSize();
			Fog.Fill(255, 0, 0, 0);
			GenerateBuildingGrid();

			if (GameComponent.DEV)
			{
				for (int i = 0; i < 48; ++i)
				{
					CurrentPlayer.AddInvItem(new TurretInv());
					CurrentPlayer.AddInvItem(new MineInv());
					CurrentPlayer.AddInvItem(new DispenserInv());
				}
			}
		}

		public static void UpdateBitmapSize()
		{
			int w = GameComponent.GetScreenWidth();
			int h = GameComponent.GetScreenHeight();

			Background.SetScreenSize(w, h);
			Fog.SetScreenSize(w, h);
			BuildingGrid.SetScreenSize(w, h);
		}

		private void GenerateBackground()
		{
			Background = new GBitmap(CurrentLevelWidth * GTile.WIDTH, CurrentLevelHeight * GTile.HEIGHT);
			foreach (GTile Tile in Tiles) { if (Tile.IsStatic)Tile.Render(Background); }
			foreach (GEntity Entity in Entities) { if (Entity.IsStatic) Entity.Render(Background); }
		}

		private void GenerateBuildingGrid()
		{
			int lw = CurrentLevelWidth * GTile.WIDTH;
			int lh = CurrentLevelHeight * GTile.HEIGHT;

			Color col = Color.FromArgb(75, 255, 255, 255);

			for (int x = -CurrentLevelWidth * 3; x < CurrentLevelWidth * 3; ++x)
			{
				BuildingGrid.DrawLine(col, 1, x * GTile.WIDTH / 3, 0, x * GTile.WIDTH / 3, lh);
			}

			for (int y = -CurrentLevelHeight * 3; y < CurrentLevelHeight * 3; ++y)
			{
				BuildingGrid.DrawLine(col, 1, 0, y * GTile.HEIGHT / 3, lw, y * GTile.HEIGHT / 3);
			}
		}

		public static bool CreateEntity(GEntity Entity, int playerId)
		{
			int[] Offs = GetNewEntityOffsets(playerId);

			Entity.Owner = playerId;
			Entity.X = GetPlayer(playerId).X + Offs[0];
			Entity.Y = GetPlayer(playerId).Y + Offs[1];

			if (Entity.HasRange)
			{
				Entity.UpdateRange();
			}

			if (GetIntersectingEntities(Entity).Count == 0 && GetIntersectingPlayers(Entity, IntersectionType.BY_DIFF_OWNER).Count == 0)
			{
				AddEntity(Entity);
				return true;
			}

			return false;
		}

		private void ManageBonusGeneration()
		{
			if (!Client.IsMain) return;
			if (SkippedBonusGenTicks++ > SKIP_BONUSGEN_TICKS)
			{
				SkippedBonusGenTicks = 0;

				if (Bonuses.Count <= 16)
				{
					int[] NewBonusCoor = GetFutureBonusTiles();
					Bonus FutureBonus = Bonus.GetFullBonusList()[Program.Rand.Next(0, Bonus.GetFullBonusList().Length - 1)];
					FutureBonus.Id = GetBonusId();
					FutureBonus.X = NewBonusCoor[0] * GTile.WIDTH;
					FutureBonus.Y = NewBonusCoor[1] * GTile.HEIGHT;

					AddBonus(FutureBonus);
				}
			}
		}

		public void Update()
		{
			for (int i = 0; i < Bullets.Count; ++i)
			{
				Bullet B = Bullets[i];
				B.Update();
				if (B.Removed) Bullets.RemoveAt(i);
			}

			for (int i = 0; i < Tiles.Count; ++i)
			{
				GEntity T = Tiles[i];
				T.Update();
				if (T.Removed) Tiles.RemoveAt(i);
			}

			for (int i = 0; i < Entities.Count; ++i)
			{
				GEntity E = Entities[i];
				E.HasFocus = false;
				E.Update();
				if (E.Removed) Entities.RemoveAt(i);
			}

			for (int i = 0; i < Particles.Count; ++i)
			{
				Particle P = Particles[i];
				P.Update();
				if (P.Removed) Particles.RemoveAt(i);
			}

			for (int i = 0; i < Bonuses.Count; ++i)
			{
				Bonus B = Bonuses.ElementAt(i).Value;
				B.Update();
				if (B.Removed || (B.LifeSpanExpired && Client.IsMain))
				{
					Client.OnBonusRemove(B.Id);
					Bonuses.Remove(B.Id);
				}
			}

			CurrentPlayer.Update();

			if (CurrentPlayer.Removed && (Client.IsConnected || Client.IsMain))
			{
				CurrentPlayer.Respawn();
			}

			ManageBonusGeneration();

			Client.Update(CurrentPlayer);
		}

		public void Render(GBitmap screen)
		{
			int Rs = 3;

			screen.SetOffset(XScroll, YScroll);
			Background.SetOffset(XScroll, YScroll);
			screen.Blit(new GBitmap(Background.GetClippedImage()), XScroll, YScroll);

			foreach (GEntity T in Tiles) if (InCameraFocus(T) && !T.IsStatic) { T.Render(screen); ++Rs; }

			if (ShowGrid)
			{
				BuildingGrid.SetOffset(XScroll, YScroll);
				screen.Blit(new GBitmap(BuildingGrid.GetClippedImage()), XScroll, YScroll);
			}

			foreach (GEntity E in Entities) if (InCameraFocus(E) && !E.IsStatic) { E.Render(screen); ++Rs; }
			foreach (Particle P in Particles) if (InCameraFocus(P)) { P.Render(screen); ++Rs; }
			foreach (KeyValuePair<int, Bonus> B in Bonuses) if (InCameraFocus(B.Value)) { B.Value.Render(screen); ++Rs; }

			try
			{
				foreach (Player P in Players) if (P != null && InCameraFocus(P)) { P.Render(screen); ++Rs; }
			}
			catch { }
			CurrentPlayer.Render(screen);

			foreach (Bullet B in Bullets) if (InCameraFocus(B)) { B.Render(screen); ++Rs; }

			Fog.SetOffset(XScroll, YScroll);
			//screen.Blit(new GBitmap(Fog.GetClippedImage()), XScroll, YScroll);

			GFont.Write(screen, Rs + " objects", 1, 10, 10);
			GFont.Write(screen, "red score " + Score.Red + ", " + "blu score " + Score.Blu, 1, 10, 20);
		}
	}
}