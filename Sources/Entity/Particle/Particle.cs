using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Entity;
using System.Drawing;
using Gfx;

namespace Entity.Particle
{
    public class Particle : GEntity
    {
        protected int LifeTime;
        protected int Living = 0;

        protected int AnimationStates = 0;
        protected int CurrentAnimState = 0;
        protected int ImgXStart = 0;
        protected int ImgYStart = 0;

        public Particle() { }

        public Particle(float x, float y, int w, int h, int lifeTime)
            : base(x, y, w, h)
        {
            this.LifeTime = lifeTime;
        }

        public Particle(float x, float y, int w, int h, Directions Direction, int lifeTime)
            : base(x, y, w, h)
        {
            this.Direction = Direction;
            this.LifeTime = lifeTime;
        }

        public void SetupAnimation(int States, int ImgXStart, int ImgYStart)
        {
            AnimationStates = States;
            this.ImgXStart = ImgXStart;
            this.ImgYStart = ImgYStart;
        }

        public override void Update()
        {
            if (Living++ > LifeTime)
            {
                Remove();
            }
        }

        public void UpdateAnimation()
        {
            if (CurrentAnimState <= AnimationStates)
            {
                ++CurrentAnimState;
            }
        }

        public void RenderAnimation(GBitmap screen)
        {
            if (CurrentAnimState <= AnimationStates)
            {
                screen.Blit(Art.GRAPHICS[ImgXStart + CurrentAnimState, ImgYStart], iX, iY);
            }
        }
    }
}