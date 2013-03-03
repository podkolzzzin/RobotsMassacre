using Gfx;
using Gui.Components;
using Level;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui
{
	public class TeamSelect : GuiScreen
	{
		private MenuList Menu;

		public TeamSelect(InputHandler Input)
			: base(Input, false, false, false, true)
		{
			this.Menu = new MenuList(Input, new string[] { "red", "blu" });
		}

		public override void Update()
		{
			Menu.Update();

			if (Menu.Is(0)) GameLevel.CurrentPlayer.SetTeam(Teams.Red);
			else if (Menu.Is(1)) GameLevel.CurrentPlayer.SetTeam(Teams.Blu);

			if (Input.Attack.Clicked)
			{
				GameGuiScreen.TeamNotSelected = false;
				GameLevel.CurrentPlayer.Respawn();
			}
		}

		public override void Render(GBitmap screen)
		{
			screen.Fill(175, 0, 0, 0);
			Menu.Render(screen);
		}
	}
}