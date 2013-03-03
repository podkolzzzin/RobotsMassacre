using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity.Details
{
    public class Shore : GDetail
    {
        protected int ShoreState = GetArbitraryAnimationFrame();

        public Shore(float x, float y, Directions Dir) : base(x, y, Dir, true) { }
    }
}