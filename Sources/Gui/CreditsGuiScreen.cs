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
	public class CreditsGuiScreen : GuiScreen
	{
		private TextScreen Text = new TextScreen();

		public CreditsGuiScreen(InputHandler Input)
			: base(Input, true, true, false, false)
		{
			SetTitle("credits");

			Text.SetY(60);
			Text.AddLine("dedicated to java.");
			Text.AddLine("");
			Text.AddLine("andrey podkolzin - network, map editor");
			Text.AddLine("alexey - the code");
			Text.AddLine("stanislav matviychuck - graphics");
		}

		public override void Update()
		{
			base.Update();
		}

		public override void Render(GBitmap screen)
		{
			base.Render(screen);
			Text.Render(screen);
		}
	}
}