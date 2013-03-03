using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Robots_Massacre_Client
{
	public class InputHandler
	{
		public class Key
		{
			public int Presses, Absorbs;
			public bool Down = false, Clicked = false;

			public Key()
			{
				KeyList.Add(this);
			}

			public void Toggle(bool Pressed)
			{
				Down = Pressed;
				if (Pressed)
				{
					++Presses;
				}
			}

			public void Tick()
			{
				if (Absorbs < Presses)
				{
					++Absorbs;
					Clicked = true;
				}
				else
				{
					Clicked = false;
				}
			}
		}

		private string KeyChar = "";
		public static List<Key> KeyList = new List<Key>();

		public Key Left = new Key();
		public Key Right = new Key();
		public Key Down = new Key();
		public Key Up = new Key();
		public Key Attack = new Key();

		public Key _0 = new Key();
		public Key _1 = new Key();
		public Key _2 = new Key();
		public Key _3 = new Key();
		public Key _4 = new Key();
		public Key _5 = new Key();
		public Key _6 = new Key();
		public Key _7 = new Key();
		public Key _8 = new Key();
		public Key _9 = new Key();

		public Key Tab = new Key();
		public Key Ctrl = new Key();
        public Key F1 = new Key();
        public Key F2 = new Key();
        public Key F3 = new Key();

		public Key E = new Key();
		public Key V = new Key();
		public Key Z = new Key();
		public Key G = new Key();
        public Key C = new Key();
        public Key Y = new Key();
        public Key X = new Key();
        public Key Q = new Key();
        public Key M = new Key();
        public Key S = new Key();

		public Key Esc = new Key();
		public Key Backspace = new Key();
        public Key Shift = new Key();
		public Key Dot = new Key();
		public Key Delete = new Key();

		public InputHandler(GameComponent component)
		{
			component.KeyDown += new KeyEventHandler(OnKeyDown);
			component.KeyUp += new KeyEventHandler(OnKeyUp);
		}

		public void ReleaseAll()
		{
			foreach (Key K in KeyList)
			{
				K.Down = false;
			}
		}

		public void Tick()
		{
			foreach (Key K in KeyList)
			{
				K.Tick();
			}
		}

		private void OnKeyDown(object Sender, KeyEventArgs e)
		{
			int code = (int)e.KeyCode;
			if (code >= (int)Keys.A && code <= (int)Keys.Z) KeyChar = e.KeyCode.ToString();
            Shift.Toggle(e.Shift);
			Toggle(e.KeyCode, true);
		}

		private void OnKeyUp(object Sender, KeyEventArgs e)
		{
			KeyChar = "";
            Shift.Toggle(e.Shift);
			Toggle(e.KeyCode, false);
		}

		public void Toggle(Keys Key, bool Pressed)
		{
			if (Key == Keys.A || Key == Keys.Left) Left.Toggle(Pressed);
			if (Key == Keys.D || Key == Keys.Right) Right.Toggle(Pressed);
			if (Key == Keys.S || Key == Keys.Down) Down.Toggle(Pressed);
			if (Key == Keys.W || Key == Keys.Up) Up.Toggle(Pressed);
			if (Key == Keys.Space || Key == Keys.Enter) Attack.Toggle(Pressed);

			if (Key == Keys.D0 || Key == Keys.NumPad0) _0.Toggle(Pressed);
			if (Key == Keys.D1 || Key == Keys.NumPad1) _1.Toggle(Pressed);
			if (Key == Keys.D2 || Key == Keys.NumPad2) _2.Toggle(Pressed);
			if (Key == Keys.D3 || Key == Keys.NumPad3) _3.Toggle(Pressed);
			if (Key == Keys.D4 || Key == Keys.NumPad4) _4.Toggle(Pressed);
			if (Key == Keys.D5 || Key == Keys.NumPad5) _5.Toggle(Pressed);
			if (Key == Keys.D6 || Key == Keys.NumPad6) _6.Toggle(Pressed);
			if (Key == Keys.D7 || Key == Keys.NumPad7) _7.Toggle(Pressed);
			if (Key == Keys.D8 || Key == Keys.NumPad8) _8.Toggle(Pressed);
			if (Key == Keys.D9 || Key == Keys.NumPad9) _9.Toggle(Pressed);

			if (Key == Keys.Tab) Tab.Toggle(Pressed);
			if (Key == Keys.ControlKey) Ctrl.Toggle(Pressed);
			if (Key == Keys.E) E.Toggle(Pressed);
			if (Key == Keys.V) V.Toggle(Pressed);
			if (Key == Keys.Z) Z.Toggle(Pressed);
			if (Key == Keys.G) G.Toggle(Pressed);
            if (Key == Keys.C) C.Toggle(Pressed);
            if (Key == Keys.Y) Y.Toggle(Pressed);
            if (Key == Keys.X) X.Toggle(Pressed);
            if (Key == Keys.Q) Q.Toggle(Pressed);
            if (Key == Keys.M) M.Toggle(Pressed);
            if (Key == Keys.S) S.Toggle(Pressed);

			if (Key == Keys.Escape) Esc.Toggle(Pressed);
			if (Key == Keys.Back) Backspace.Toggle(Pressed);
			if (Key == Keys.OemPeriod) Dot.Toggle(Pressed);
			if (Key == Keys.Delete) Delete.Toggle(Pressed);
            if (Key == Keys.Shift) Shift.Toggle(Pressed);
            if (Key == Keys.F1) F1.Toggle(Pressed);
            if (Key == Keys.F2) F2.Toggle(Pressed);
            if (Key == Keys.F3) F3.Toggle(Pressed);
		}

		public string GetPressed()
		{
			return KeyChar;
		}
	}
}