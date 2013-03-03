using Gfx;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity.Particle
{
    public class WallDebris : Particle
    {
        private int DebrisState = GetArbitraryAnimationFrame();

        public WallDebris(float x, float y)
            : base(x, y, 30, 30, 250)
        {
            SetupAnimation(10, 6, 2);
        }

        public override void Update()
        {
            base.Update();
            base.UpdateAnimation();
        }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.GRAPHICS[3, 2], iX, iY);
            base.RenderAnimation(screen);
        }
    }
}