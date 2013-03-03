using System.ComponentModel;
using System.Drawing;
using System.Windows.Forms;

namespace Robots_Massacre_Client
{
	partial class GameComponent
	{
		private IContainer components = null;

		protected override void Dispose(bool disposing)
		{
			if (disposing && (components != null))
			{
				components.Dispose();
			}

			base.Dispose(disposing);
		}

		private void InitializeComponent()
		{
			this.components = new Container();
			this.AutoScaleMode = AutoScaleMode.Font;

			int w = 640;
			int h = w * 3 / 4;
			this.MinimumSize = new Size(w + 16, h + 39);
			this.MaximumSize = this.MinimumSize;
			this.ClientSize = this.MinimumSize;

			this.Text = "Robots Massacre";
		}
	}
}