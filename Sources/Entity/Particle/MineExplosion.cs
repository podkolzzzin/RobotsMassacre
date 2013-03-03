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
    public class MineExplosion : Particle
    {
        private int ExplosionState;

        public MineExplosion(float x, float y)
            : base(x, y, 30, 30, Program.Rand.Next(1, 5)) {
            ExplosionState = GetArbitraryAnimationFrame() + GetArbitraryAnimationFrame();
            if(ExplosionState > 5) ExplosionState = 5;
        }

        public override void Render(GBitmap screen)
        {
            screen.Blit(Art.GRAPHICS[11 + ExplosionState, 0], iX, iY);
        }
    }
}