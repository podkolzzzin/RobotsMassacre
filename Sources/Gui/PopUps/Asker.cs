using Gfx;
using Gui.Components;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui.PopUps
{
	public class Asker : GuiScreen
	{
		private MenuList Menu;
		private Action[] callbacks;
		private int BackgroundTransparency = 255;

		public Asker(InputHandler Input, string message, string[] variants)
			: base(Input, true, false, false, true)
		{
			SetTitle(message);
			this.Menu = new MenuList(Input, variants);
			this.callbacks = new Action[variants.Length];
			Menu.SetStartY(60);
			Menu.SetFontSize(1);
		}

		public override void Update()
		{
			Menu.Update();

			for (int i = 0; i < callbacks.Length; ++i)
			{
				if (Menu.Is(i) && callbacks[i] != null) callbacks[i]();
			}
		}

		public override void Render(GBitmap screen)
		{
			screen.Fill(BackgroundTransparency, 0, 0, 0);
			base.Render(screen);
			Menu.Render(screen);
		}

		public void SetCallback(int item, Action callback)
		{
			callbacks[item] = callback;
		}

		public void SetBgTransparency(int trans)
		{
			this.BackgroundTransparency = trans;
		}
	}
}