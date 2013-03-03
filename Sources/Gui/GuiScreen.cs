using Gfx;
using Gui.Components;
using Gui.PopUps;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace Gui
{
	public class GuiScreen
	{
		public InputHandler Input;
		public List<GuiComponent> Controls = new List<GuiComponent>();

		public bool AskIsOn = false;
		protected Asker AskPopUp;

		public bool PassTick = false;

		protected bool ForbidReturning = false;
		private bool RenderTitle;
		private bool RenderTip;
		private string ScreenTitle = "";
		private string TipMessage = "press esc to return";

		public bool NonClearableScreen = false;

		public GuiScreen(InputHandler Input, bool renderTitle, bool renderTip, bool requiresQuit, bool forbidReturning)
		{
			if (requiresQuit)
			{
				this.AskPopUp = new Asker(Input, "really quit?", new string[] { "yes", "nope" });
				AskPopUp.SetBgTransparency(255);
			}

			this.NonClearableScreen = false;
			this.Input = Input;
			this.RenderTitle = renderTitle;
			this.RenderTip = renderTip;
			this.ForbidReturning = forbidReturning;
		}

		protected void SetTitle(string title)
		{
			this.ScreenTitle = title;
		}

		protected void SetTip(string message)
		{
			this.TipMessage = message;
		}

		public virtual void Resized() { }

		public virtual void StartServer() { }

		public virtual void ClientConnect(IPAddress Ip, int port = -1) { }

		public virtual void Update()
		{
			PassTick = false;
			if (Input.Esc.Clicked && !ForbidReturning)
			{
				GameComponent.SetPreviousScreen();
			}

			if (AskIsOn) AskPopUp.Update();

			foreach (GuiComponent item in Controls) item.Update();
		}

		public virtual void Render(GBitmap screen)
		{
			//if (!NonClearableScreen) screen.Fill(255, 0, 0, 0);
			if (RenderTitle && !AskIsOn) GFont.WriteXCenter(screen, ScreenTitle, 2, 20);
			foreach (GuiComponent item in Controls) item.Render(screen);
			if (RenderTip && !AskIsOn) GFont.WriteXCenter(screen, TipMessage, 1, screen.ScreenHeight - 20);
			if (AskIsOn) AskPopUp.Render(screen);
		}

		protected void AskToQuit(Action negCallback)
		{
			AskIsOn = true;
			AskPopUp.SetCallback(0, delegate()
			{
				GameComponent.Quit();
			});
			AskPopUp.SetCallback(1, negCallback);
		}

		public void ReleaseAllFocus()
		{
			foreach (GuiComponent component in Controls)
			{
				component.SetFocus(false);
			}
		}
	}
}