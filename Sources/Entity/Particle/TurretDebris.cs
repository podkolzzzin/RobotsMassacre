using Gfx;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity.Particle
{
    public class TurretDebris : Particle
    {
        private int DebrisState = GetArbitraryAnimationFrame();

        public TurretDebris(float x, float y, Directions Direction)
            : base(x, y, 30, 30, Direction, 250)
        {
            SetupAnimation(9, 0, 8);
        }

        public override void Update()
        {
            base.Update();
            base.UpdateAnimation();
        }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.Rotate(Art.GRAPHICS[8 + DebrisState, 15], (int)Direction * 90), iX, iY);
            base.RenderAnimation(screen);
        }
    }
}