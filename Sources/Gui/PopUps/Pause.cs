using Gfx;
using Gui.Components;
using Level;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui.PopUps
{
	public class Pause : GuiScreen
	{
		private MenuList Menu;

		public Pause(InputHandler Input)
			: base(Input, true, false, true, true)
		{
			SetTitle("paused");

			List<string> items = new List<string>();
			items.Add("continue");
			if (GameLevel.GetMode() != Modes.Deathmatch) items.Add("change team");
			items.Add("disconnect");
			items.Add("quit game");

			this.Menu = new MenuList(Input, items.ToArray());
			Menu.SetStartY(60);
			Menu.SetFontSize(1);

			AskPopUp.SetBgTransparency(175);
		}

		public override void Update()
		{
			base.Update();
			if (!AskIsOn) Menu.Update();

			if (Menu.Is(0))
			{
				GameGuiScreen.Paused = false;
				GameGuiScreen.Self.StartPlaying();
			}

			int disconnectIndex = 2;
			int quitIndex = 3;
			
			if (GameLevel.GetMode() == Modes.Deathmatch)
			{
				--disconnectIndex;
				--quitIndex;
			}
			else if (Menu.Is(1))
			{
				// Change team stuff...
			}

			if (Menu.Is(disconnectIndex))
			{
				DisconnectGame();
				GameComponent.SetCurrentScreen(0);
			}

			if (!PassTick && Menu.Is(quitIndex))
			{
				DisconnectGame();
				AskToQuit(delegate()
				{
					Pause pause = ((GameGuiScreen)GameComponent.GetScreen(4)).PausePopUp;
					pause.AskIsOn = false;
					pause.PassTick = true;
				});
			}
		}

		public override void Render(GBitmap screen)
		{
			if (!AskIsOn)
			{
				screen.Fill(175, 0, 0, 0);
				Menu.Render(screen);
			}
			base.Render(screen);
		}

		private void DisconnectGame()
		{
			((GameGuiScreen)GameComponent.GetScreen(4)).Client.Disconnect();

			// Save statistics

			GameComponent.Gs.StatsTimePlayed += GameGuiScreen.Self.PlayingTime;
			GameComponent.GSettings.Save();
		}
	}
}