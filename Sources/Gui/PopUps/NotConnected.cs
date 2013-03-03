using Gfx;
using Gui.Components;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui.PopUps
{
	public class NotConnected : GuiScreen
	{
		public NotConnected(InputHandler Input) : base(Input, false, false, false, true) { }

		public void Render(GBitmap screen, double progress)
		{
			screen.Fill(175, 0, 0, 0);
			GFont.WriteCenterLine(screen, "connecting.. " + (int)progress + "%", 2, 0);
		}
	}
}