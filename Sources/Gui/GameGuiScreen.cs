using Network;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using Entity.Particle.Bonus;
using Gui.Components;
using Gui.PopUps;
using Inventory;
using Level;
using Gfx;
using Robots_Massacre_Client;

namespace Gui
{
	public class GameGuiScreen : GuiScreen
	{
		private GameLevel Level;
		public GameClient Client;

		public Pause PausePopUp;
		private TeamSelect TeamSelectPopUp;
		private GameStatistics StatsPopUp;
		private NotConnected NotConnectedPopUp;

		private long PlayingStart = 0;
		public long PlayingTime = 0;
		public static GameGuiScreen Self;

		public static bool Paused = false;
		public static bool TeamNotSelected = true;
		public static bool NotConnected = false;
		private bool ShowStatistics = false;

		public GameGuiScreen(InputHandler Input)
			: base(Input, false, false, false, true)
		{
			this.TeamSelectPopUp = new TeamSelect(Input);
			this.StatsPopUp = new GameStatistics(Input);
			this.NotConnectedPopUp = new NotConnected(Input);
			Self = this;
		}

		public override void Resized()
		{
			GameLevel.CenterCameraOnPlayer();
			GameLevel.UpdateBitmapSize();
		}

		public override void StartServer()
		{
			Client = new GameClient();
			this.Level = new GameLevel(Input, Client);
			InitGame();
		}

		public override void ClientConnect(IPAddress Ip, int port = -1)
		{
			if (port == -1) port = GameClient.CLIENT_PORT;
			Client = new GameClient(Ip, port);
			this.Level = new GameLevel(Input, Client);
			InitGame();
		}

		private void InitGame()
		{
			if (GameLevel.GetMode() == Modes.Deathmatch) TeamNotSelected = false;
			this.PausePopUp = new Pause(Input);
			StartPlaying();
		}

		public void StartPlaying()
		{
			PlayingStart = Program.GetCurrentTimeMillis();
		}

		public void StopPlaying()
		{
			PlayingTime += Program.GetCurrentTimeMillis() - PlayingStart;
			PlayingStart = 0;
		}

		public static bool IsPlaying()
		{
			return !Paused && !TeamNotSelected && !NotConnected;
		}

		public override void Update()
		{
			if (Level != null) Level.Update();

			ShowStatistics = Input.Tab.Down;
			if (Input.Esc.Clicked) Paused = !Paused;

			if (Paused) PausePopUp.Update();
			if (TeamNotSelected) TeamSelectPopUp.Update();

			if (!IsPlaying()) StopPlaying();
		}

		public override void Render(GBitmap screen)
		{
			if (Level != null) Level.Render(screen);

			RenderGameGui(screen);
			GFont.Write(screen, "" + GameComponent.Gs.IntStatsShots, 1, 10, 30);

			if (Paused) PausePopUp.Render(screen);
			if (TeamNotSelected) TeamSelectPopUp.Render(screen);
			if (ShowStatistics) StatsPopUp.Render(screen);
		}

		private void RenderGameGui(GBitmap screen)
		{
			screen.FillRect(Color.Black, screen.XOffset, screen.ScreenHeight - 45 + screen.YOffset, screen.ScreenWidth, 45);

			screen.Blit(Art.GRAPHICS[1, 18], 10 + screen.XOffset, screen.ScreenHeight - 30 + screen.YOffset);
			string HSign = "" + GameLevel.CurrentPlayer.Health;
			GFont.Write(screen, HSign, 1, new Point(31, screen.ScreenHeight - 26));

			int ax = 31 + GFont.GetStringWidth(HSign, 1) + 10;
			string ASign = "" + GameLevel.CurrentPlayer.Ammunition;
			screen.Blit(Art.GRAPHICS[0, 18], ax + screen.XOffset, screen.ScreenHeight - 30 + screen.YOffset);
			GFont.Write(screen, ASign, 1, ax + 16 + 5, screen.ScreenHeight - 26);

			int xPaddingBonuses = 5;
			int xPaddingInventory = 22 - 1;
			int w = 24;
			int h = 4;
			int xBonuses = screen.ScreenWidth - w - 13;
			int xInventory = screen.ScreenWidth / 2 - ((w + xPaddingInventory) * GameLevel.CurrentPlayer.Inventory.Count) / 2;

			for (int i = GameLevel.CurrentPlayer.PickedBonuses.Count - 1; i >= 0; --i)
			{
				Bonus B = GameLevel.CurrentPlayer.PickedBonuses[i];

				screen.Blit(Art.GRAPHICS[B.ImageIndex, 19], xBonuses - 3 + screen.XOffset, screen.ScreenHeight - 29 - 8 + screen.YOffset);

				if (B.Active)
				{
					int bw = (w - 2) - (int)((double)B.GetLifeSpan() / B.GetDuration() * (w - 2));
					screen.FillRect(Color.Green, xBonuses + 1 + screen.XOffset, screen.ScreenHeight - 9 - h - 1 + screen.YOffset, bw, h);
				}

				xBonuses -= w + xPaddingBonuses;
			}

			foreach (InvItem I in GameLevel.CurrentPlayer.Inventory)
			{
				if (I.IsSelected())
				{
					screen.FillRect(Color.FromArgb(200, 113, 123, 140), xInventory - 7 - 5 * 2 + screen.XOffset, screen.ScreenHeight - 29 - 8 - 7 + screen.YOffset, 45, 44);
				}

				GFont.Write(screen, "" + I.ActivationKey, 1, new Point(xInventory - 7 - 5, screen.ScreenHeight - 29 + 9 - 5));

				screen.Blit(Art.GRAPHICS[I.ImageIconIndex, 19], xInventory - 3 + screen.XOffset, screen.ScreenHeight - 29 - 8 + screen.YOffset);

				if (I.Amount > 1)
				{
					string AmSign = "" + I.Amount;
					GFont.Write(screen, AmSign, 1, new Point(xInventory + w / 2 - GFont.GetStringWidth(AmSign, 1) / 2, screen.ScreenHeight - 7 - 2));
				}

				xInventory += w + xPaddingInventory;
			}
		}
	}
}