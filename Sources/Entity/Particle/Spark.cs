using Gfx;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity.Particle
{
    public class Spark : Particle
    {
        public Spark(float x, float y, Directions Direction)
            : base(x, y, 30, 30, Direction, 4)
        {
            SetupAnimation(3, 0, 7);
        }

        public override void Update()
        {
            base.Update();
            base.UpdateAnimation();
        }

        public override void Render(GBitmap screen)
        {
            if (CurrentAnimState <= AnimationStates)
            {
                Directions Dir = GEntity.GetOppositeDirection(Direction);
                int[] Offsets = GetSparkOffsets(Dir);
                screen.Blit(Art.Rotate(Art.GRAPHICS[ImgXStart + CurrentAnimState, ImgYStart], (int)Dir * 90), iX + Offsets[0], iY + Offsets[1]);
            }
        }

        private int[] GetSparkOffsets(Directions Dir)
        {
            int[] Offsets = new int[] { 0, 0 };

            if (Dir == Directions.Left)
            {
                Offsets[0] = -14;
                Offsets[1] = -13;
            }
            else if (Dir == Directions.Right)
            {
                Offsets[0] = -14;
                Offsets[1] = -11;
            }
            else if (Dir == Directions.Up)
            {
                Offsets[0] = -12;
                Offsets[1] = -12;
            }
            else if (Dir == Directions.Down)
            {
                Offsets[0] = -14;
                Offsets[1] = -14;
            }

            return Offsets;
        }
    }
}