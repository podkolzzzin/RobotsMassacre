using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Gui.Components;
using Robots_Massacre_Client;
using Gfx;

namespace Gui
{
	public class MenuGuiScreen : GuiScreen
	{
		private MenuList Menu;

		public MenuGuiScreen(InputHandler Input)
			: base(Input, true, false, true, true)
		{
			SetTitle("robots massacre");
			this.Menu = new MenuList(Input, new string[] { "create game", "join game", "map editor", "settings", "how to play", "credits", "quit" }, new int[] { 5, 1, 6, 11, 2, 3, -1 });
			Menu.SetStartY(60);
		}

		public override void Update()
		{
			base.Update();
			if(!AskIsOn) Menu.Update();

			if (Menu.Is(ItemIndexes.Last) && !PassTick)
			{
				AskToQuit(delegate()
				{
					GameComponent.GetCurrentScreen().AskIsOn = false;
					GameComponent.GetCurrentScreen().PassTick = true;
				});
			}
		}

		public override void Render(GBitmap screen)
		{
			Menu.Render(screen);
			base.Render(screen);
		}
	}
}