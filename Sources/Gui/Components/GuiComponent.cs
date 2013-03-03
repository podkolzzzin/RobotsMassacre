using Gfx;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui.Components
{
	public abstract class GuiComponent
	{
		protected InputHandler Input;

		public int X = 0;
		public int Y = 0;
		public int Width;
		public int Height;
		public bool IsFocused = false;

		public GuiComponent() { }

		public GuiComponent(InputHandler Input)
		{
			this.Input = Input;
		}

		public GuiComponent(InputHandler Input, int x, int y)
		{
			this.Input = Input;
			this.X = x;
			this.Y = y;
		}

		public void SetX(int x)
		{
			this.X = x;
		}

		public void SetY(int y)
		{
			this.Y = y;
		}

		public void SetFocus(bool focus)
		{
			IsFocused = focus;
		}

		public virtual void Update() { }

		public virtual void Render(GBitmap screen) { }
	}
}