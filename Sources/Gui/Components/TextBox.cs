using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace Gui.Components
{
	public enum InputTypes
	{
		All = 1, NumbersOnly = 2
	}

	public class TextBox : Label
	{
		private int _cursorPos;
		private int _cursorShowing;
		public int MaxLength { get; set; }
		public InputTypes InputType;
		private string _prevKeyChar;
		private int _waidForDuplicate;

		private OptionChange KeyDownCallback;

		public override int Size
		{
			get
			{
				return base.Size;
			}
			set
			{
				Height = GFont.GetLetterDimension(value);
				base.Size = value;
			}
		}

		public TextBox(InputHandler Input)
			: base(Input)
		{
			MaxLength = int.MaxValue;
			Text = "";
			_cursorPos = 0;
		}

		public override void Render(Gfx.GBitmap screen)
		{
			if (IsFocused)
			{
				int x = X + GFont.GetStringWidth(Text.Substring(0, _cursorPos), Size);
				if (_cursorShowing > 0)
				{
					screen.DrawLine(Color.White, 2, x, Y, x, Y + Height);
				}
				_cursorShowing--;
				if (_cursorShowing < -8)
					_cursorShowing = 8;
			}
			base.Render(screen);
		}

		public override void Update()
		{
			string PreviousText = Text;

			_waidForDuplicate--;
			if (!IsFocused)
				return;

			string _contents = "";
			if (Input._0.Clicked) _contents += "" + 0;
			else if (Input._1.Clicked) _contents += "" + 1;
			else if (Input._2.Clicked) _contents += "" + 2;
			else if (Input._3.Clicked) _contents += "" + 3;
			else if (Input._4.Clicked) _contents += "" + 4;
			else if (Input._5.Clicked) _contents += "" + 5;
			else if (Input._6.Clicked) _contents += "" + 6;
			else if (Input._7.Clicked) _contents += "" + 7;
			else if (Input._8.Clicked) _contents += "" + 8;
			else if (Input._9.Clicked) _contents += "" + 9;
			else if (Input.Dot.Clicked) _contents += ".";
			else if (Input.GetPressed() != "" && InputType != InputTypes.NumbersOnly)
				_contents += Input.GetPressed();
			else if (Input.Left.Clicked && _cursorPos != 0) _cursorPos--;
			else if (Input.Right.Clicked && _cursorPos < Text.Length) _cursorPos++;
			else if (Input.Backspace.Clicked && Text.Length > 0 && _cursorPos != 0)
			{
				Text = Text.Substring(0, _cursorPos - 1) + Text.Substring(_cursorPos);
				_cursorPos--;
			}
			else if (Input.Delete.Clicked && _cursorPos < Text.Length)
			{
				Text = Text.Substring(0, _cursorPos) + Text.Substring(_cursorPos + 1);
			}
			else if (Input.Ctrl.Down && Input.V.Clicked)
			{
				IDataObject iData = Clipboard.GetDataObject();
				if (iData.GetDataPresent(DataFormats.Text))
				{
					_contents += (String)iData.GetData(DataFormats.Text);
				}
			}

			if (_contents != "")
			{
				if (_waidForDuplicate > 0 && _contents == _prevKeyChar)
					return;
				string before = Text.Substring(0, _cursorPos) + _contents;
				string after = Text.Substring(_cursorPos);
				string all = before + after;
				if (all.Length <= MaxLength)
				{
					_cursorPos += _contents.Length;
					Text = all;
				}
				else
				{
					Text = all.Substring(0, MaxLength);
					_cursorPos = MaxLength;
					if (before.Length < MaxLength)
						_cursorPos = before.Length;
					else
						_cursorPos = MaxLength;
				}
				_prevKeyChar = _contents;
				_waidForDuplicate = 4;
			}

			if (Text.Equals(PreviousText) && KeyDownCallback != null)
			{
				KeyDownCallback(Text);
			}

			base.Update();
		}

		public bool IsEmpty()
		{
			return Text == "";
		}

		public string GetContents()
		{
			return Text;
		}

		public void AppendText(string text)
		{
			if (text.Length + Text.Length > MaxLength) text = text.Substring(0, MaxLength - Text.Length);
			Text += text;
			_cursorPos += text.Length;
		}

		public void SetKeyDownCallback(OptionChange callback)
		{
			this.KeyDownCallback = callback;
		}
	}
}