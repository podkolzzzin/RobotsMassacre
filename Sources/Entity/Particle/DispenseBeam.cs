using Gfx;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity.Particle
{
    public enum DispenseBeamType
    {
        Heal = 1, Ammunition = 2
    }

    public class DispenseBeam : Particle
    {
        private GEntity From, To;
        private new DispenseBeamType Type;
        private int BeamState = GetArbitraryAnimationFrame();

        private int Life = Program.Rand.Next(10) + 20;
        private double Position = Program.Rand.NextDouble() * (1 - 0.2);
        private double Speed = (Program.Rand.NextDouble() + 0.4) * 0.02;

        private double Xo = (Program.Rand.NextDouble() - 0.5) * 5;
        private double Yo = (Program.Rand.NextDouble() - 0.5) * 5;

        public DispenseBeam(GEntity From, GEntity To, DispenseBeamType Type)
        {
            this.From = From;
            this.To = To;
            this.Type = Type;
        }

        // TODO
        // Remove noticeable twitches when moving
        public override void Update()
        {
            if (--Life < 0 || Position > 1)
            {
                Remove();
                return;
            }

            // Bézier Curves. Wooohoooo!

            int FromArbDir = Program.Rand.Next(0, 3);

            double xs = From.X + Math.Cos(FromArbDir) * 4;
            double ys = From.Y + Math.Sin(FromArbDir) * 4;

            double xm = From.X + Math.Cos(FromArbDir) * 32;
            double ym = From.Y + Math.Sin(FromArbDir) * 32;

            double x0 = xs + (xm - From.X) * Position;
            double y0 = ys + (ym - From.Y) * Position;

            double x1 = xm + (To.X - xm) * Position;
            double y1 = ym + (To.Y - ym) * Position;

            X = (float)(x0 + (x1 - x0) * Position + Xo * Position);
            Y = (float)(y0 + (y1 - y0) * Position + Yo * Position);

            Position += Speed;
        }

        public override void Render(GBitmap screen)
        {
            int XStart = 0;

            if (Type == DispenseBeamType.Heal) XStart = 11;
            if (Type == DispenseBeamType.Ammunition) XStart = 14;

            screen.Blit(Art.GRAPHICS[XStart + BeamState, 1], iX, iY);
        }
    }
}