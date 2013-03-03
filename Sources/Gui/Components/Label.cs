using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui.Components
{
    public enum TextAlignment
    {
        CenterScreen, Center, Left, Right
    }
    public class Label : GuiComponent
    {
        public string Text { get; set; }
        public TextAlignment Alignment { get; set; }
        public virtual int Size { get; set; }
        public Label(InputHandler Input)
            : base(Input)
        {
            Size = 1;
            Alignment = TextAlignment.Left;
        }
        public override void Render(Gfx.GBitmap screen)
        {
            if (Text != null)
            {
                switch (Alignment)
                { 
                    case TextAlignment.CenterScreen:
                        GFont.WriteXCenter(screen, Text, Size, Y);
                        break;
                    case TextAlignment.Left:
                        GFont.Write(screen, Text, Size, X, Y);
                        break;
                    case TextAlignment.Right:
                        GFont.WriteRight(screen, Text, Size, X, Y, Width);
                        break;
                    case TextAlignment.Center:
                        GFont.WriteCenter(screen, Text, Size, X, Y, Width);
                        break;
                }
            }
        }
        public override void Update(){}
    }
}
