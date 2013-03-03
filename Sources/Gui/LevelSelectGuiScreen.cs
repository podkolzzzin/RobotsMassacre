using Gfx;
using Gui.Components;
using Level;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

namespace Gui
{
	public class LevelSelectGuiScreen : GuiScreen
	{
		private SelectableGrid Selector;

		public LevelSelectGuiScreen(InputHandler Input)
			: base(Input, true, true, false, false)
		{
			SetTitle("select level");
		}

		public void InitLevelList()
		{
			Controls.Clear();

			Selector = new SelectableGrid(Input, 100, 60, 4);
			Selector.SetX(100);
			Selector.SetY(60);
			Selector.SetBorder(3);
			Selector.SetItemDimension(100, 100);

			LevelManager manager = new LevelManager();

			for (int i = 0; i < manager.GetLevelsAmount(GameLevel.GetMode()); ++i)
			{
				string name = manager.GetLevelName(GameLevel.GetMode(), i);
				GBitmap thumbnail = LevelGen.CreateThumbnail(manager.GetLevelStream(GameLevel.GetMode(), i));
				Selector.Push(new GridItem(manager.ParseName(GameLevel.GetMode(), name), thumbnail));
			}

			Controls.Add(Selector);
		}

		public override void Update()
		{
			base.Update();

			if (Input.Attack.Clicked)
			{
				int level = Selector.Selected;
				GameLevel.SetLevel(level);
				GameComponent.GetScreen(4).StartServer();
				GameComponent.SetCurrentScreen(4);
			}
		}

		public override void Render(GBitmap screen)
		{
			base.Render(screen);
			GFont.Write(screen, "mode " + (int)GameLevel.GetMode(), 1, 10, 10);
			GFont.Write(screen, "levels " + Selector.Grid.Count, 1, 10, 20);
		}
	}
}