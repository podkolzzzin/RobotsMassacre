using Gfx;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui.Components
{
	class NumericUpDown : GuiComponent
	{
		public int Value = 0;
		public int MinValue = 0;
		public int MaxValue = 0;

		public NumericUpDown(InputHandler Input)
			: base(Input)
		{

		}

		private int _isLastAddition;
		private int _isLastSubtraction;
		public override void Update()
		{
			if (!IsFocused)
				return;
			if (Input.Left.Clicked || Input.Down.Clicked)
			{
				Value--;
				_isLastSubtraction = 5;
				_isLastAddition = 0;
			}
			else if (Input.Right.Clicked || Input.Up.Clicked)
			{
				Value++;
				_isLastAddition = 5;
				_isLastSubtraction = 0;
			}
			else
			{
				_isLastSubtraction--;
				_isLastAddition--;
			}

			if (Value < MinValue)
				Value = MaxValue;
			else if (Value > MaxValue)
				Value = MinValue;
		}

		public override void Render(GBitmap screen)
		{
			if (IsFocused)
			{
				if (_isLastAddition > 0)
				{
					GFont.Write(screen, "<", 2, X, Y);
					GFont.Write(screen, "        >", 1, X, Y + GFont.GetLetterDimension(2) / 4);
				}
				else if (_isLastSubtraction > 0)
				{
					GFont.Write(screen, "<", 1, X, Y + GFont.GetLetterDimension(2) / 4);
					GFont.Write(screen, "    >", 2, X, Y);
				}
				else
				{
					GFont.Write(screen, "<   >", 2, X, Y);
				}
			}
			int xOffset = 0;
			if (Value.ToString().Length < 3)
				xOffset = GFont.GetStringWidth(" ", 2) / 2;
			if (Value.ToString().Length < 2)
				xOffset += GFont.GetStringWidth(" ", 2) / 2;
			GFont.Write(screen, " " + Value, 2, X + xOffset, Y);
		}
	}
}
