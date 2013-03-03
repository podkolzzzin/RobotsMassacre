using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace Gui
{
	class OpenMapGuiScreen : GuiScreen
	{
		public OpenMapGuiScreen(InputHandler Input)
			: base(Input, false, false, false, false)
		{

		}
		public override void Update()
		{
			OpenFileDialog ofd = new OpenFileDialog();
			ofd.RestoreDirectory = true;
			ofd.InitialDirectory = new FileInfo(Application.ExecutablePath).DirectoryName + "\\levels";
			ofd.Filter = "Robots Massacre Map Files (*.rmm)|*.rmm";
			GameComponent.GameTimer.Stop();
			if (ofd.ShowDialog() == DialogResult.OK)
			{
				GameComponent.GameTimer.Start();
                ((MapEditorGuiScreen)GameComponent.GetScreen(9)).Construct(ofd.FileName);
				GameComponent.SetCurrentScreen(9);
			}
			else
			{
                GameComponent.GameTimer.Start();
				GameComponent.SetPreviousScreen();
			}
			base.Update();
		}
	}
}
