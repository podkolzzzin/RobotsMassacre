using Gfx;
using Gui.Components;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui.Components
{
	public class TextScreen : GuiComponent
	{
		private List<string> Lines = new List<string>();

		public int TotalHeight
		{
			get
			{
				return 15 * Lines.Count;
			}
		}

		public TextScreen() { }

		public void AddLine(string line)
		{
			Lines.Add(line);
		}

		public override void Render(GBitmap screen)
		{
			int yo = Y;
			foreach (string line in Lines)
			{
				if (X > 0)
				{
					GFont.Write(screen, line, 1, X, yo);
				}
				else
				{
					GFont.WriteXCenter(screen, line, 1, yo);
				}

				yo += 15;
			}
		}
	}
}