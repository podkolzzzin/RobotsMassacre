using Network;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using Gui.Components;
using Robots_Massacre_Client;
using Gfx;
using Level;

namespace Gui
{
	public class JoinGuiScreen : GuiScreen
	{
		private Label IpLabel;
		private TextBox InputBox;

		public JoinGuiScreen(InputHandler Input)
			: base(Input, true, true, false, false)
		{
			SetTitle("join game");

			IpLabel = new Label(Input);
			IpLabel.Text = "enter ip: ";
			IpLabel.Size = 1;
			IpLabel.X = 20;
			IpLabel.Y = 60;
			Controls.Add(IpLabel);

			InputBox = new TextBox(Input);
			InputBox.MaxLength = 15;
			InputBox.Size = 1;
			InputBox.X = 20 + GFont.GetStringWidth(IpLabel.Text, 1);
			InputBox.Y = 60;
			InputBox.IsFocused = true;
			InputBox.InputType = InputTypes.NumbersOnly;
			Controls.Add(InputBox);

			if (GameComponent.DEV)
			{
				InputBox.AppendText(GameClient.SelfIP.ToString());
			}

			Update();
		}

		public override void Update()
		{
			base.Update();

			IpLabel.X = GameComponent.GetScreenWidth() / 2 - IpLabel.Width - 100;
			InputBox.X = IpLabel.X + IpLabel.Width + 100;

			if (Input.Attack.Clicked && !InputBox.IsEmpty())
			{
				GameComponent.GetScreen(4).ClientConnect(IPAddress.Parse(InputBox.GetContents()));
				GameComponent.SetCurrentScreen(4);
			}
		}

		public override void Render(GBitmap screen)
		{
			base.Render(screen);
		}
	}
}