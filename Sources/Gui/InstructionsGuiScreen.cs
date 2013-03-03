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
	public class InstructionsGuiScreen : GuiScreen
	{
		private TextScreen Text = new TextScreen();

		public InstructionsGuiScreen(InputHandler Input)
			: base(Input, true, true, false, false)
		{
			SetTitle("how to play");

			Text.SetY(60);
			Text.AddLine("use wasd or arrows to move, and break or space to shoot.");
			Text.AddLine("to show up statistics, press tab during game.");
			Text.AddLine("");
			Text.AddLine("in deathmatch mode, you are to kill everything moveable.");
			Text.AddLine("in teamdeathmatch mode, your team is to kill everything moveable.");
			Text.AddLine("and in capture the flag mode, you team must sneak more hostile");
			Text.AddLine("flags than enemies do in 5 minutes.");
			Text.AddLine("");
			Text.AddLine("isn't that easy?");
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