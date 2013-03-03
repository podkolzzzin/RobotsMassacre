using Gfx;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui.Components
{
	public class UpDownControl : GuiComponent
	{
		private OptionChange Callback;
		private List<string> Values = new List<string>();
		private int CurrentIndex = 0;

		public UpDownControl(InputHandler Input, int x, int y) : base(Input, x, y) { }

		public override void Update()
		{
			if (IsFocused)
			{
				if (Input.Left.Clicked) --CurrentIndex;
				if (Input.Right.Clicked) ++CurrentIndex;
				if (CurrentIndex < 0) CurrentIndex += Values.Count;
				if (CurrentIndex >= Values.Count) CurrentIndex -= Values.Count;

				Callback(GetCurrentValue());
			}
		}

		public override void Render(GBitmap screen)
		{
			GFont.Write(screen, "<" + Values[CurrentIndex] + ">", 1, X, Y);
		}

		public void CreateCallback(OptionChange callback)
		{
			Callback = callback;
		}

		public string GetCurrentValue()
		{
			return Values[CurrentIndex];
		}

		public void SetCurrent(int i)
		{
			CurrentIndex = i;
		}

		public void PushValue(string v)
		{
			Values.Add(v);
		}
	}
}