using Gfx;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity.Particle
{
    public class BarrelFlame : Particle
    {
        private bool IsTurret;

        public BarrelFlame(float x, float y, Directions Direction, bool IsTurret)
            : base(x, y, 6, 6, Direction, 2)
        {
            this.IsTurret = IsTurret;
        }

        public override void Render(GBitmap screen)
        {
            float[] Spo = GetFlameOffsets();
            screen.Blit(Art.Rotate(Art.GRAPHICS[4, 1], (int)Direction * 90), iX + (int)Spo[0], iY + (int)Spo[1]);
        }

        private float[] GetFlameOffsets()
        {
            int Bw = 4;
            int Bh = 0;
            float Bx = 0;
            float By = 0;

            if (Direction == Directions.Up)
            {
                Bx = Player.WIDTH / 2 - Bw / 2 - 1;
                By = -Bh - 4;

                if (IsTurret) Bx += 3;
            }
            else if (Direction == Directions.Right)
            {
                Bw = Bw + Bh;
                Bh = Bw - Bh;
                Bw = Bw - Bh;

                Bx = Player.WIDTH - 3;
                By = Player.HEIGHT / 2 - Bh / 2 - 1.5f;

                if (IsTurret)
                {
                    Bx += 3;
                    By += 0.5f;
                }
            }
            else if (Direction == Directions.Down)
            {
                Bx = Player.WIDTH / 2 - Bw / 2 - 1;
                By = Player.HEIGHT - 3;

                if (IsTurret)
                {
                    Bx += 1.5f;
                    By += 2;
                }
            }
            else if (Direction == Directions.Left)
            {
                Bw = Bw + Bh;
                Bh = Bw - Bh;
                Bw = Bw - Bh;

                Bx = -Bw - 4;
                By = Player.HEIGHT / 2 - Bh / 2 - 1;

                if (IsTurret) By += 2;
            }

            return new float[] { Bx - 12, By - 12 };
        }
    }
}