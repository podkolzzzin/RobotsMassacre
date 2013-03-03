using Gfx;
using Gui.Components;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui
{
    public class MapEditorHelpGuiScreen:GuiScreen
    {
        private TextScreen Text = new TextScreen();

        public MapEditorHelpGuiScreen(InputHandler Input)
			: base(Input, true, true, false, false)
		{
			SetTitle("Map editor help");

			Text.SetY(60);
			Text.AddLine("arrows or wasd to move.");
			Text.AddLine("shift for multiple selection.");
			Text.AddLine("Ctrl+C, Ctrl+V, Ctrl+X to copy, paste and cut, accordingly.");
			Text.AddLine("Ctrl+Z, Ctrl+Y to undo and redo.");
			Text.AddLine("M to activate minimap.");
			Text.AddLine("Q to preview the whole level.");
			Text.AddLine("Ctrl+S to save.");
			Text.AddLine("F1 and F2 to activate the lines of");
			Text.AddLine("vertical and horizontal symmetry, accordingly.");
            Text.AddLine("F3 to deactivate the lines of symmetry.");
            Text.AddLine("");
			Text.AddLine("isn't that easy?");
		}

		public override void Update()
		{
			base.Update();
		}

		public override void Render(GBitmap screen)
		{
			base.Render(screen);
			Text.Render(screen);
		}
    }
}
