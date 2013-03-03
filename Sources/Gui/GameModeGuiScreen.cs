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
	public class GameModeGuiScreen : GuiScreen
	{
		private MenuList Menu;

		public GameModeGuiScreen(InputHandler Input)
			: base(Input, true, true, false, false)
		{
			SetTitle("select game mode");
			this.Menu = new MenuList(Input, new string[] { "deathmatch", "team deathmatch", "capture the flag" }, new int[] { 10, 10, 10 });
			Menu.SetStartY(60);
			Menu.SetFontSize(1);
		}

		public override void Update()
		{
			base.Update();
			Menu.Update();

			int mode = 3;
			if (Menu.Is(0)) mode = 1;
			else if (Menu.Is(1)) mode = 2;

			GameLevel.SetMode((Modes)mode);

			if (Input.Attack.Clicked)
			{
				((LevelSelectGuiScreen)GameComponent.GetScreen(10)).InitLevelList();
			}
		}

		public override void Render(GBitmap screen)
		{
			base.Render(screen);
			Menu.Render(screen);
		}
	}
}