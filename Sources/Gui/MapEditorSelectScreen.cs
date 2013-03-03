using Gui.Components;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui
{
	public class MapEditorSelectScreen : GuiScreen
	{
		private MenuList _menu;

		public MapEditorSelectScreen(InputHandler Input)
			: base(Input, true, true, false, false)
		{
			SetTitle("map editor");
            _menu = new MenuList(Input, new string[] { "Create map", "Open map", "Download map", "How to use" }, new int[] { 7, 8, 13, 12 });
			_menu.SetStartY(60);
			_menu.SetFontSize(1);
		}

		public override void Update()
		{
			_menu.Update();
			base.Update();
		}

		public override void Render(Gfx.GBitmap screen)
		{
			_menu.Render(screen);
			base.Render(screen);
		}
	}
}